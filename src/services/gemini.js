/**
 * Service to interact with the Gemini API to transcribe mathematical questions
 * from pasted images using gemini-2.5-flash.
 */

const SYSTEM_PROMPT = `You are an expert mathematics educator and OCR transcriber. Your job is to convert the uploaded image of a math question into high-quality, beautifully formatted digital text.

Follow these strict rules:
1. LaTeX formatting: Use LaTeX syntax for all math symbols. Inline math MUST be enclosed in single dollar signs $...$ (e.g. $x^2 + y^2 = r^2$, $\\theta = 45^\\circ$, or $\\frac{dy}{dx}$). Block equations/formulas MUST be enclosed in double dollar signs $$...$$ (e.g. $$\\int_{0}^{\\pi} \\sin(x) dx = 2$$).
2. Double-check syntax: Ensure all LaTeX delimiters are properly balanced. Always escape common LaTeX commands properly in your JSON response (e.g. use double backslashes in JSON strings: \\\\frac, \\\\sqrt, \\\\alpha, etc.).
3. Diagram Extraction: If there is a diagram, drawing, geometry shape, or coordinate plot in the image, regenerate it using clean vector SVG path code or a Mermaid.js diagram definition.
   - SVG is preferred for custom shapes (triangles, circles, custom angles, axes, coordinate graphs).
     * Output ONLY valid, self-contained SVG code starting with <svg> and ending with </svg>.
     * Set stroke="currentColor" and fill="none" (or fill with semi-transparent colors if appropriate) and stroke-width="2".
     * Design it to look extremely clean and fit in a maximum width of 400px and height of 250px.
     * Include clear text labels using <text> tags for vertices (A, B, C), lengths, or angles.
     * Ensure the stroke color works on a white paper background (black or dark colors) and is responsive to dark mode using CSS currentColor.
   - Mermaid is preferred for graphs, state machines, flowcharts, trees, or relational matrices.
     * Output a clean Mermaid string without enclosing code blocks or backticks.
4. Clean OCR: Remove any noise, page numbers, or watermark text. If the question has multiple choices (MCQ), format them as a clean list. Do not output conversational filler. Just return the structured question.`;

export async function convertImageToQuestion(base64Data, mimeType, apiKey) {
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please configure it in Settings.");
  }

  // Remove data:image/...;base64, prefix if present
  const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: SYSTEM_PROMPT
          },
          {
            inlineData: {
              mimeType: mimeType || "image/png",
              data: base64Clean
            }
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          questionText: {
            type: "STRING",
            description: "The transcribed question text. All mathematical expressions, terms, numbers, variables, or formulas MUST be properly formatted with LaTeX inline delimiters $...$ or block delimiters $$...$$. Example: 'Solve the equation $x^2 - 5x + 6 = 0$ for $x$.'"
          },
          hasDiagram: {
            type: "BOOLEAN",
            description: "Set to true if the question contains a diagram, graph, geometry figure, or coordinate drawing."
          },
          diagramType: {
            type: "STRING",
            enum: ["mermaid", "svg", "none"],
            description: "Specify 'svg' for geometric shapes/plots, 'mermaid' for node graphs/trees, or 'none' if no diagram is present."
          },
          diagramCode: {
            type: "STRING",
            description: "The generated SVG path code or Mermaid graph string. For SVG, it must be complete <svg>...</svg> XML. For Mermaid, raw graph text. Leave blank if none."
          },
          suggestedMarks: {
            type: "INTEGER",
            description: "Suggested marks/points for this question based on its academic complexity (e.g. 1 for simple MCQ, 2-3 for short answer, 4-6 for long analytical or multi-step proofs)."
          }
        },
        required: ["questionText", "hasDiagram", "diagramType", "diagramCode", "suggestedMarks"]
      }
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || `HTTP error ${response.status}`;
      throw new Error(`Gemini API Error: ${errorMsg}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error("No response received from Gemini model. Check if the image content is valid.");
    }

    const parsedData = JSON.parse(responseText);
    return parsedData;
  } catch (error) {
    console.error("OCR API failed:", error);
    throw error;
  }
}

const SOLUTIONS_SYSTEM_PROMPT = `You are an expert mathematics educator. Your job is to provide detailed, step-by-step mathematical solutions for the given question paper.
Follow these strict rules:
1. LaTeX formatting: Use LaTeX syntax for all math symbols. Inline math MUST be enclosed in single dollar signs $...$ (e.g. $x = 2$). Block equations/formulas MUST be enclosed in double dollar signs $$...$$.
2. Step-by-step logic: Explain each step clearly so a student can follow the solution.
3. Clean JSON Output: Return a JSON object with a single key "solutions", containing an array of objects. Each object in the array must have two fields:
   - "id": The exact ID of the question.
   - "solutionText": The detailed step-by-step solution text in LaTeX/markdown format.
Do not output conversational filler. Just return the JSON object.`;

export async function generateSolutionsForPaper(paperMeta, questions, apiKey) {
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please configure it in Settings.");
  }
  if (!questions || questions.length === 0) {
    throw new Error("No questions found to generate solutions for.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  // Build a textual representation of the paper for Gemini context
  const paperText = `
School: ${paperMeta.schoolName}
Exam: ${paperMeta.examTitle}
Subject: ${paperMeta.subject}

Questions to solve:
${questions.map((q, idx) => `
ID: ${q.id}
Question ${idx + 1} (${q.marks} Marks):
${q.questionText}
${q.hasDiagram ? `[Contains a diagram of type ${q.diagramType}]` : ""}
`).join("\n")}
`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: SOLUTIONS_SYSTEM_PROMPT
          },
          {
            text: `Please generate detailed solutions for this question paper:\n${paperText}`
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          solutions: {
            type: "ARRAY",
            description: "List of step-by-step solutions corresponding to the questions.",
            items: {
              type: "OBJECT",
              properties: {
                id: {
                  type: "STRING",
                  description: "The unique ID of the question."
                },
                solutionText: {
                  type: "STRING",
                  description: "The detailed step-by-step solution text with LaTeX notation."
                }
              },
              required: ["id", "solutionText"]
            }
          }
        },
        required: ["solutions"]
      }
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || `HTTP error ${response.status}`;
      throw new Error(`Gemini API Error: ${errorMsg}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error("No response received from Gemini model.");
    }

    const parsedData = JSON.parse(responseText);
    return parsedData.solutions;
  } catch (error) {
    console.error("Solutions API failed:", error);
    throw error;
  }
}

const PRACTICE_SYSTEM_PROMPT = `You are an expert mathematics educator. Your job is to generate high-quality, academic practice question sets with matching step-by-step solutions based on the uploaded PDF textbook materials or study notes.

Follow these strict rules:
1. LaTeX formatting: Use LaTeX syntax for all math symbols. Inline math MUST be enclosed in single dollar signs $...$ (e.g. $x^2 + y^2 = r^2$, $\\theta = 45^\\circ$). Block equations/formulas MUST be enclosed in double dollar signs $$...$$ (e.g. $$\\int_{0}^{\\pi} \\sin(x) dx = 2$$).
2. Double-check delimiters: Ensure all LaTeX delimiters are properly closed.
3. Content Alignment: Read the uploaded PDF text carefully. Extract core topics, notation conventions, and difficulty levels, and generate authentic practice questions.
4. Set Differentiation: Ensure each practice set has distinct, non-overlapping questions. If there is not enough source material in the PDFs to make all questions completely distinct, you may include some overlapping or minor variations of questions across sets, but maximize variety.
5. Clean JSON Output: Return a JSON object starting and ending with braces. Do not include conversational filler or code block backticks. The schema must strictly have a single key "practiceSets" containing an array of sets. Each set has a "setName" and a "questions" array. Inside "questions", each object must have "questionText", "marks", and "solutionText".`;

export async function generatePracticeSets(pdfFiles, questionsPerSet, setLimit, customPrompt, apiKey) {
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please configure it in Settings.");
  }
  if (!pdfFiles || pdfFiles.length === 0) {
    throw new Error("No PDF files provided to analyze.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  // Map each PDF file to an inlineData part
  const pdfParts = pdfFiles.map(file => {
    // Remove header if present
    const base64Clean = file.base64.replace(/^data:application\/pdf;base64,/, "");
    return {
      inlineData: {
        mimeType: "application/pdf",
        data: base64Clean
      }
    };
  });

  const promptText = `
Please analyze the attached PDF documents and generate:
- Number of Practice Sets: ${setLimit}
- Number of Questions per Set: ${questionsPerSet}
${customPrompt ? `- Additional Guidelines / Topics: ${customPrompt}` : ""}

Make sure the questions are distinct across the sets where possible. If the source material is limited, you can reuse or slightly vary some questions. Provide step-by-step LaTeX explanations for every question.
`;

  const payload = {
    contents: [
      {
        parts: [
          { text: PRACTICE_SYSTEM_PROMPT },
          ...pdfParts,
          { text: promptText }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          practiceSets: {
            type: "ARRAY",
            description: "List of generated practice sets.",
            items: {
              type: "OBJECT",
              properties: {
                setName: {
                  type: "STRING",
                  description: "Name of the practice set (e.g. 'Practice Set 1')."
                },
                questions: {
                  type: "ARRAY",
                  description: "List of questions in this practice set.",
                  items: {
                    type: "OBJECT",
                    properties: {
                      questionText: {
                        type: "STRING",
                        description: "The math question text. Use LaTeX delimiters $...$ for inline and $$...$$ for blocks."
                      },
                      marks: {
                        type: "INTEGER",
                        description: "Suggested marks (e.g. 2, 3, 5)."
                      },
                      solutionText: {
                        type: "STRING",
                        description: "Detailed step-by-step mathematical solution using LaTeX delimiters."
                      }
                    },
                    required: ["questionText", "marks", "solutionText"]
                  }
                }
              },
              required: ["setName", "questions"]
            }
          }
        },
        required: ["practiceSets"]
      }
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || `HTTP error ${response.status}`;
      throw new Error(`Gemini API Error: ${errorMsg}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error("No response received from Gemini model.");
    }

    const parsedData = JSON.parse(responseText);
    return parsedData.practiceSets;
  } catch (error) {
    console.error("Practice generator failed:", error);
    throw error;
  }
}


