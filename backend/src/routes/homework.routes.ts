import { Router, Request, Response } from 'express';
import { GeminiService } from '../services/ai/gemini.service.js';
import { successResponse, errorResponse } from '../utils/api-response.js';

const router = Router();

/**
 * POST /api/homework/generate
 * Generates English homework questions using Gemini AI
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { topic, gradeLevel, difficulty, questionCount = 5, types = [] } = req.body;

    if (!topic) {
      return errorResponse(res, 'Vui lòng cung cấp chủ đề bài tập (topic)', 400);
    }

    const typePromptStr = types.length > 0 ? types.join(', ') : 'MULTIPLE_CHOICE, FILL_BLANK, ESSAY, WORD_REORDER';

    const systemInstruction = `Bạn là chuyên gia sư phạm Tiếng Anh hàng đầu. Hãy tạo một bộ bài tập về nhà tiếng Anh chuẩn xác, đầy đủ đáp án và giải thích ngữ pháp chi tiết.
Định dạng trả về BẮT BUỘC là một JSON array thuần túy (không kèm markdown \`\`\`json hay text thừa).
Mỗi phần tử trong array là một object câu hỏi với schema:
{
  "id": "q-1",
  "type": "MULTIPLE_CHOICE" | "FILL_BLANK" | "ESSAY" | "WORD_REORDER" | "MATCHING" | "ERROR_CORRECTION" | "PRONUNCIATION",
  "prompt": "Nội dung câu hỏi",
  "points": 1.5,
  "explanation": "Giải thích chi tiết ngữ pháp tiếng Anh bằng tiếng Việt",
  "options": ["A", "B", "C", "D"], // nếu là MULTIPLE_CHOICE hoặc PRONUNCIATION
  "correctOptionIndex": 0, // số nguyên 0..3 nếu là MCQ
  "sentenceWithBlanks": "She [has worked] here for [five] years.", // nếu là FILL_BLANK
  "acceptedAnswers": ["has worked", "five"], // nếu là FILL_BLANK
  "minWords": 40, // nếu là ESSAY
  "maxWords": 100, // nếu là ESSAY
  "sampleAnswer": "Đoạn văn mẫu tiếng Anh", // nếu là ESSAY
  "words": ["English", "is", "spoken", "globally."], // nếu là WORD_REORDER
  "correctSentence": "English is spoken globally.", // nếu là WORD_REORDER
  "pairs": [{"left": "Give up", "right": "Quit"}], // nếu là MATCHING
  "sentence": "She (A) don't (B) like (C) apples.", // nếu là ERROR_CORRECTION
  "errorOptions": [{"label": "A", "text": "don't"}], // nếu là ERROR_CORRECTION
  "correctOption": "A", // nếu là ERROR_CORRECTION
  "correction": "doesn't" // nếu là ERROR_CORRECTION
}`;

    const prompt = `Yêu cầu tạo bài tập tiếng Anh:
- Chủ đề: ${topic}
- Trình độ học sinh: ${gradeLevel || 'Lớp 10-12 / B1'}
- Độ khó: ${difficulty || 'MEDIUM'}
- Số lượng câu hỏi: ${questionCount}
- Các dạng bài tập mong muốn: ${typePromptStr}

Hãy trả về đúng JSON array.`;

    const rawResponse = await GeminiService.generateText(prompt, systemInstruction);

    // Try parsing JSON array from response
    let questions = [];
    try {
      const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const jsonStart = cleaned.indexOf('[');
      const jsonEnd = cleaned.lastIndexOf(']');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        questions = JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1));
      } else {
        questions = JSON.parse(cleaned);
      }
    } catch {
      // If parsing fails, return empty so frontend uses resilient fallback
      return errorResponse(res, 'Không thể parse JSON từ AI', 500);
    }

    return successResponse(res, questions, 'Tạo bài tập tiếng Anh thành công');
  } catch (error: any) {
    return errorResponse(res, error.message || 'Lỗi tạo bài tập AI', 500);
  }
});

/**
 * POST /api/homework/grade-essay
 * Evaluates student essay with Gemini AI
 */
router.post('/grade-essay', async (req: Request, res: Response) => {
  try {
    const { prompt, essayText, sampleAnswer, maxScore = 2 } = req.body;

    if (!essayText) {
      return errorResponse(res, 'Vui lòng cung cấp nội dung bài viết', 400);
    }

    const systemInstruction = `Bạn là giám khảo chấm bài viết tiếng Anh (IELTS/CEFR Examiner). Hãy chấm bài viết tự luận của học sinh và trả về một JSON object DUY NHẤT (không kèm text thừa):
{
  "score": 1.7, // điểm số thực tế từ 0 đến ${maxScore}
  "maxScore": ${maxScore},
  "grammarScore": 1.6,
  "vocabScore": 1.8,
  "coherenceScore": 1.7,
  "feedback": "Nhận xét chi tiết điểm mạnh, lỗi ngữ pháp, dùng từ bằng tiếng Việt",
  "suggestedImprovement": "Đoạn văn viết lại hoàn chỉnh tự nhiên hơn",
  "highlightedErrors": ["lỗi 1: giải thích sửa", "lỗi 2: giải thích sửa"]
}`;

    const userPrompt = `Đề bài: ${prompt}
Bài làm của học sinh:
"""
${essayText}
"""
${sampleAnswer ? `Bài mẫu tham khảo: "${sampleAnswer}"` : ''}
Điểm tối đa: ${maxScore}

Hãy chấm điểm và nhận xét chi tiết.`;

    const rawResponse = await GeminiService.generateText(userPrompt, systemInstruction);

    let evaluation = null;
    try {
      const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const jsonStart = cleaned.indexOf('{');
      const jsonEnd = cleaned.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        evaluation = JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1));
      } else {
        evaluation = JSON.parse(cleaned);
      }
    } catch {
      return errorResponse(res, 'Không thể parse JSON phản hồi của AI', 500);
    }

    return successResponse(res, evaluation, 'Chấm bài tự luận thành công');
  } catch (error: any) {
    return errorResponse(res, error.message || 'Lỗi chấm bài tự luận', 500);
  }
});

export default router;
