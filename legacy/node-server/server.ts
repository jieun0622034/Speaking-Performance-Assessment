import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Rubric generation endpoint
app.post('/api/rubric/generate', async (req: Request, res: Response) => {
  try {
    const { title, subject, grade, achievementStandard, prompt, submissionType, gradingMode } = req.body;

    if (!aiClient) {
      // Fallback mock rubric if API key is not yet configured
      return res.json({
        criteria: [
          {
            id: 'crit-1',
            name: '과제 수행 및 내용 충실성',
            target: submissionType === 'both' ? 'both' : submissionType,
            maxScore: 5,
            levels: {
              high: { label: '상', desc: '과제 안내의 핵심 요구사항을 모두 충족하고 주제와 관련된 풍부하고 구체적인 내용을 제시함.', score: 5 },
              mid: { label: '중', desc: '과제 요구사항을 대체로 충족하나 일부 구체성이 부족하거나 내용 전개가 단순함.', score: 3.5 },
              low: { label: '하', desc: '과제 요구사항을 충분히 충족하지 못하고 주제와 무관하거나 단편적인 내용에 그침.', score: 2 },
            },
          },
          {
            id: 'crit-2',
            name: '구성 및 논리적 흐름',
            target: submissionType === 'both' ? 'both' : submissionType,
            maxScore: 5,
            levels: {
              high: { label: '상', desc: '도입-본론-결론의 구조가 명확하고 문장 및 발화 간의 연결이 매우 자연스러움.', score: 5 },
              mid: { label: '중', desc: '기본적인 구조를 갖추었으나 문단 간의 연결이 다소 부자연스럽거나 비약이 있음.', score: 3.5 },
              low: { label: '하', desc: '구조적 완결성이 결여되어 있고 생각의 흐름이 일관되지 못함.', score: 2 },
            },
          },
          {
            id: 'crit-3',
            name: submissionType === 'speaking' ? '표현 및 어휘 적절성' : '어휘 및 문맥 표현력',
            target: submissionType === 'both' ? 'both' : submissionType,
            maxScore: 5,
            levels: {
              high: { label: '상', desc: '주제에 부합하는 다양한 어휘와 적절한 문장 형식을 능숙하게 구사함.', score: 5 },
              mid: { label: '중', desc: '기본적인 어휘를 사용하며 의미 전달에는 지장이 없으나 표현이 제한적임.', score: 3.5 },
              low: { label: '하', desc: '어휘 및 표현의 오류로 인해 의미 전달이 어렵거나 극히 제한적임.', score: 2 },
            },
          },
          {
            id: 'crit-4',
            name: submissionType === 'speaking' ? '유창성 및 전달력' : '문장 완성도 및 기술',
            target: submissionType === 'both' ? 'speaking' : submissionType,
            maxScore: 5,
            levels: {
              high: { label: '상', desc: gradingMode === 'content' ? '내용 전달이 막힘없이 원활하게 이루어짐.' : '자연스러운 속도와 억양으로 유창하게 전달함.', score: 5 },
              mid: { label: '중', desc: gradingMode === 'content' ? '약간의 주저함이 있으나 전체적인 의사소통 흐름이 유지됨.' : '다소의 망설임이나 부자연스러움이 있으나 전달 가능함.', score: 3.5 },
              low: { label: '하', desc: gradingMode === 'content' ? '내용 전달이 심하게 끊겨 이해하기 어려움.' : '잦은 멈춤과 부정확성으로 전달력이 현저히 떨어짐.', score: 2 },
            },
          },
        ],
      });
    }

    const systemInstruction = `당신은 대한민국 중·고등학교 교육과정 평가 전문가입니다.
교사가 입력한 평가 정보(교과, 학년, 성취기준, 과제 안내문, 제출 유형, 채점 모드)를 바탕으로 신뢰할 수 있는 3~4개의 수행평가 루브릭(채점 기준)을 JSON으로 생성하십시오.

채점 모드 규칙:
- gradingMode가 'content'(내용 중심)인 경우: 발음, 억양, 말더듬, 목소리 크기, 단순 맞춤법/타자 실수를 감점 사유로 삼지 않고, 의미 전달과 내용 구성에 집중하는 루브릭을 구성해야 합니다.
- gradingMode가 'fluency'(내용 + 표현·유창성)인 경우: 표현의 자연스러움, 유창성, 문장 완성도 등을 별도 항목으로 포함할 수 있습니다.

제출 유형:
- submissionType이 'speaking'이면 말하기 중심 항목
- 'writing'이면 쓰기 중심 항목
- 'both'이면 각 항목의 target을 'speaking', 'writing', 'both' 중 가장 적합한 것으로 지정.`;

    const promptText = `평가 이름: ${title}
교과: ${subject || '영어'}
학년: ${grade || '중학교 2학년'}
성취기준: ${achievementStandard || '자신의 일상과 생각에 대해 표현할 수 있다.'}
과제 안내문: ${prompt || '주제에 대해 자신의 생각을 논리적으로 표현하세요.'}
제출 유형: ${submissionType}
채점 모드: ${gradingMode === 'content' ? '내용 중심 (발음/억양/타자실수 감점 금지)' : '내용 + 표현·유창성'}

위 정보를 반영하여 교사가 바로 활용할 수 있는 실용적이고 객관적인 루브릭 3~4개를 작성해 주세요.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            criteria: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  target: { type: Type.STRING, description: "'speaking' | 'writing' | 'both'" },
                  maxScore: { type: Type.NUMBER },
                  levels: {
                    type: Type.OBJECT,
                    properties: {
                      high: {
                        type: Type.OBJECT,
                        properties: {
                          label: { type: Type.STRING },
                          desc: { type: Type.STRING },
                          score: { type: Type.NUMBER },
                        },
                        required: ['label', 'desc', 'score'],
                      },
                      mid: {
                        type: Type.OBJECT,
                        properties: {
                          label: { type: Type.STRING },
                          desc: { type: Type.STRING },
                          score: { type: Type.NUMBER },
                        },
                        required: ['label', 'desc', 'score'],
                      },
                      low: {
                        type: Type.OBJECT,
                        properties: {
                          label: { type: Type.STRING },
                          desc: { type: Type.STRING },
                          score: { type: Type.NUMBER },
                        },
                        required: ['label', 'desc', 'score'],
                      },
                    },
                    required: ['high', 'mid', 'low'],
                  },
                },
                required: ['id', 'name', 'target', 'maxScore', 'levels'],
              },
            },
          },
          required: ['criteria'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Rubric generate error (falling back to tailored template):', error);
    const { submissionType, gradingMode } = req.body;
    return res.json({
      criteria: [
        {
          id: 'crit-1',
          name: '과제 수행 및 내용 충실성',
          target: submissionType === 'both' ? 'both' : (submissionType || 'speaking'),
          maxScore: 5,
          levels: {
            high: { label: '상', desc: '과제 안내의 핵심 요구사항을 충실히 반영하여 주제와 밀접하고 구체적인 내용을 제시함.', score: 5 },
            mid: { label: '중', desc: '과제 요구사항을 대체로 충족하나 일부 구체적 설명이 부족함.', score: 3.5 },
            low: { label: '하', desc: '과제 요구사항을 충족하지 못하고 단편적인 내용에 그침.', score: 2 },
          },
        },
        {
          id: 'crit-2',
          name: '구성 및 논리적 흐름',
          target: submissionType === 'both' ? 'both' : (submissionType || 'speaking'),
          maxScore: 5,
          levels: {
            high: { label: '상', desc: '도입, 본론, 결론의 연결이 자연스럽고 논리적 흐름이 탄탄함.', score: 5 },
            mid: { label: '중', desc: '기본적인 전개 구조를 갖추었으나 문장 간 연결이 다소 불연속적임.', score: 3.5 },
            low: { label: '하', desc: '문장 간 연결성이 부족하고 논리적 비약이 심함.', score: 2 },
          },
        },
        {
          id: 'crit-3',
          name: submissionType === 'speaking' ? '표현 및 어휘 적절성' : '어휘 및 문맥 표현력',
          target: submissionType === 'both' ? 'both' : (submissionType || 'speaking'),
          maxScore: 5,
          levels: {
            high: { label: '상', desc: '주제에 부합하는 다양한 어휘와 적절한 문장 형식을 능숙하게 구사함.', score: 5 },
            mid: { label: '중', desc: '기본적인 어휘를 사용하며 의미 전달에는 지장이 없음.', score: 3.5 },
            low: { label: '하', desc: '어휘 및 표현의 오류로 인해 의미 전달이 어렵거나 극히 제한적임.', score: 2 },
          },
        },
        {
          id: 'crit-4',
          name: submissionType === 'speaking' ? '전달력 및 발화 완성도' : '문장 완성도 및 어법',
          target: submissionType === 'both' ? 'speaking' : (submissionType || 'speaking'),
          maxScore: 5,
          levels: {
            high: { label: '상', desc: gradingMode === 'content' ? '내용 전달이 막힘없이 원활하게 이루어짐.' : '자연스러운 속도와 표현으로 완성도 높게 전달함.', score: 5 },
            mid: { label: '중', desc: gradingMode === 'content' ? '약간의 주저함이 있으나 전체적인 의사소통 흐름이 유지됨.' : '다소의 망설임이 있으나 의미 전달이 가능함.', score: 3.5 },
            low: { label: '하', desc: gradingMode === 'content' ? '내용 전달이 심하게 끊겨 이해하기 어려움.' : '잦은 멈춤과 부정확성으로 전달력이 떨어짐.', score: 2 },
          },
        },
      ],
    });
  }
});

// 2. Speaking assessment grading endpoint (Audio input)
app.post('/api/grade/speaking', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType, assessment, studentName } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: '오디오 데이터가 필요합니다.' });
    }

    if (!aiClient) {
      // Return a simulated high-quality mock grading response if no key is present
      return res.json({
        transcript: [
          { start_sec: 0, end_sec: 4, text: 'Hello everyone. Today I want to talk about my future dream.' },
          { start_sec: 5, end_sec: 11, text: 'Um, I want to become an environmental scientist because climate change is very serious.' },
          { start_sec: 12, end_sec: 18, text: 'To solve this problem, I am reading books about renewable energy and doing science club activities.' },
          { start_sec: 19, end_sec: 25, text: 'In the future, I hope to develop new clean energy technologies for the Earth. Thank you.' },
        ],
        fillers: 2,
        criteria: (assessment.criteria || []).map((c: any) => ({
          criterionId: c.id,
          name: c.name,
          score: c.levels?.high?.score || 5,
          level: '상',
          reason: '자신의 꿈인 환경 과학자와 기후 변화 해결을 위한 노력을 구체적 근거와 함께 자신감 있게 발표함.',
          evidence: [{ start_sec: 5, end_sec: 18 }],
        })),
        overall_confidence: '높음',
        confidence_reason: '발화가 명확하고 음질이 양호하며 루브릭의 모든 요건을 직접 언급함.',
        needsReview: false,
        metrics: {
          speaking: {
            durationSec: 25,
            wpm: 120,
            fillersCount: 2,
          },
        },
      });
    }

    const criteriaListText = JSON.stringify(assessment.criteria, null, 2);
    const gradingModeDesc = assessment.gradingMode === 'content'
      ? '주의: [내용 중심] 모드입니다. 발음, 억양, 말더듬, 목소리 크기, 단순 실수로 감점하지 말고 전달된 내용과 의미 중심으로만 평가하십시오.'
      : '주의: [내용 + 표현·유창성] 모드입니다. 내용뿐만 아니라 자연스러운 발화 속도와 전달력도 함께 고려하십시오.';

    const systemInstruction = `당신은 대한민국 중·고등학교 수행평가 전문 AI 채점 도우미입니다.
학생의 녹음 오디오를 청취하고 다음 작업을 수행하십시오:
1. 문장 단위로 전사(transcript)를 작성하십시오. 각 문장마다 오디오 상의 시작 초(start_sec, 정수 또는 소수점 1자리)와 종료 초(end_sec), 그리고 전사 텍스트(text)를 작성하십시오. 들리지 않거나 불명확한 부분은 지어내지 말고 반드시 "[불명확]"으로 표기하십시오.
2. 군더더기어("음", "어", "uh", "um", "er" 등)의 총 횟수(fillers)를 세십시오.
3. 주어진 루브릭 기준에 따라 학생의 발표를 공정하게 채점하십시오.
   - 모든 항목 점수에는 반드시 오디오 상의 구체적인 시간 구간 근거(evidence: [{ start_sec, end_sec }])를 붙이십시오.
   - 근거를 찾을 수 없으면 그 사실을 reason에 명시하고 confidence를 낮추십시오.
   - ${gradingModeDesc}
4. overall_confidence('높음' | '보통' | '낮음')와 그 이유를 작성하십시오.
   - STT 신뢰도가 낮거나 오디오가 불분명한 경우, 또는 점수가 등급 경계(상/중/하 커트라인)에 아슬아슬하게 걸치는 경우 confidence를 '낮음' 또는 '보통'으로 평가하고 needsReview를 true로 설정하십시오.`;

    const promptText = `과제 안내문: ${assessment.prompt}
성취기준: ${assessment.achievementStandard || '해당 성취기준'}
루브릭 기준 목록:
${criteriaListText}

위 오디오를 듣고 문장별 전사, 군더더기어 개수, 루브릭 평가, 신뢰도 평가 결과를 스키마에 맞게 JSON으로 출력하십시오.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType || 'audio/webm',
            data: audioBase64,
          },
        },
        { text: promptText },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  start_sec: { type: Type.NUMBER },
                  end_sec: { type: Type.NUMBER },
                  text: { type: Type.STRING },
                },
                required: ['start_sec', 'end_sec', 'text'],
              },
            },
            fillers: { type: Type.INTEGER },
            criteria: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  criterionId: { type: Type.STRING },
                  name: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  level: { type: Type.STRING, description: "'상' | '중' | '하'" },
                  reason: { type: Type.STRING },
                  evidence: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        start_sec: { type: Type.NUMBER },
                        end_sec: { type: Type.NUMBER },
                      },
                      required: ['start_sec', 'end_sec'],
                    },
                  },
                },
                required: ['name', 'score', 'level', 'reason', 'evidence'],
              },
            },
            overall_confidence: { type: Type.STRING, description: "'높음' | '보통' | '낮음'" },
            confidence_reason: { type: Type.STRING },
            needsReview: { type: Type.BOOLEAN },
            needsReviewReason: { type: Type.STRING },
          },
          required: ['transcript', 'fillers', 'criteria', 'overall_confidence', 'confidence_reason', 'needsReview'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    // Calculate metrics
    const totalWords = (parsed.transcript || []).reduce((acc: number, curr: any) => {
      return acc + (curr.text ? curr.text.trim().split(/\s+/).length : 0);
    }, 0);
    const lastSec = (parsed.transcript || []).reduce((max: number, curr: any) => Math.max(max, curr.end_sec || 0), 0);
    const durationMin = Math.max(0.1, lastSec / 60);
    const wpm = Math.round(totalWords / durationMin);

    parsed.metrics = {
      speaking: {
        durationSec: Math.round(lastSec),
        wpm: Math.min(300, wpm),
        fillersCount: parsed.fillers || 0,
      },
    };

    // Ensure criterionId matches
    if (parsed.criteria && assessment.criteria) {
      parsed.criteria = parsed.criteria.map((c: any, idx: number) => {
        const matching = assessment.criteria.find((ac: any) => ac.name === c.name) || assessment.criteria[idx];
        return {
          ...c,
          criterionId: matching ? matching.id : (c.criterionId || `crit-${idx}`),
        };
      });
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('Grade speaking error:', error);
    return res.status(500).json({ error: error.message || '말하기 AI 채점 실패' });
  }
});

// 3. Writing assessment grading endpoint
app.post('/api/grade/writing', async (req: Request, res: Response) => {
  try {
    const { writtenText, assessment, studentName } = req.body;

    if (!writtenText || writtenText.trim().length === 0) {
      return res.status(400).json({ error: '글 내용이 필요합니다.' });
    }

    // Split text into sentences
    const rawSentences = writtenText
      .split(/(?<=[.?!])\s+|\n+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    const charCount = writtenText.replace(/\s/g, '').length;
    const sentenceCount = rawSentences.length;
    const avgSentenceLen = sentenceCount > 0 ? Math.round(charCount / sentenceCount) : 0;

    if (!aiClient) {
      return res.json({
        sentences: rawSentences,
        criteria: (assessment.criteria || []).map((c: any, idx: number) => ({
          criterionId: c.id,
          name: c.name,
          score: c.levels?.high?.score || 5,
          level: '상',
          reason: '주제와 관련된 명확한 근거를 제시하며 논리적인 문단 구성으로 글을 작성함.',
          evidence: [{ sentence_index: Math.min(idx, rawSentences.length - 1) }],
        })),
        overall_confidence: '높음',
        confidence_reason: '글의 구조가 명확하고 분량이 충실하며 루브릭 요건을 고루 충족함.',
        needsReview: false,
        metrics: {
          writing: {
            charCount,
            sentenceCount,
            avgSentenceLen,
          },
        },
      });
    }

    const sentencesNumbered = rawSentences.map((s: string, idx: number) => `[문장 ${idx}] ${s}`).join('\n');
    const criteriaListText = JSON.stringify(assessment.criteria, null, 2);
    const gradingModeDesc = assessment.gradingMode === 'content'
      ? '주의: [내용 중심] 모드입니다. 단순 맞춤법, 띄어쓰기, 가벼운 타자 실수로 감점하지 말고 내용의 논리성과 충실도 위주로 채점하십시오.'
      : '주의: [내용 + 표현·완성도] 모드입니다. 내용뿐 아니라 문장의 정확성과 문법 완성도도 종합적으로 고려하십시오.';

    const systemInstruction = `당신은 대한민국 중·고등학교 수행평가 전문 AI 채점 도우미입니다.
학생이 작성한 글을 번호가 매겨진 문장 목록 형태로 전달받아 채점합니다.
규칙:
1. 교사가 입력한 루브릭과 성취기준만 기준으로 채점하십시오.
2. ${gradingModeDesc}
3. 각 루브릭 항목별로 점수, 등급('상'|'중'|'하'), 구체적 한 줄 이유(reason), 그리고 근거가 되는 문장 인덱스 배열(evidence: [{ sentence_index: number }])을 반드시 지정하십시오.
4. overall_confidence('높음' | '보통' | '낮음')와 그 이유를 작성하십시오.
   - 글자 수가 과제 제한에 턱없이 모자라거나, 점수가 등급 경계에 있는 경우 needsReview를 true로 하고 이유를 쓰십시오.`;

    const promptText = `과제 안내문: ${assessment.prompt}
성취기준: ${assessment.achievementStandard || '해당 성취기준'}
루브릭 기준 목록:
${criteriaListText}

학생이 제출한 글 (문장 인덱스 포함):
${sentencesNumbered}

위 글을 분석하여 JSON 형식으로 채점 결과를 반환하십시오.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            criteria: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  criterionId: { type: Type.STRING },
                  name: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  level: { type: Type.STRING, description: "'상' | '중' | '하'" },
                  reason: { type: Type.STRING },
                  evidence: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        sentence_index: { type: Type.INTEGER },
                      },
                      required: ['sentence_index'],
                    },
                  },
                },
                required: ['name', 'score', 'level', 'reason', 'evidence'],
              },
            },
            overall_confidence: { type: Type.STRING, description: "'높음' | '보통' | '낮음'" },
            confidence_reason: { type: Type.STRING },
            needsReview: { type: Type.BOOLEAN },
            needsReviewReason: { type: Type.STRING },
          },
          required: ['criteria', 'overall_confidence', 'confidence_reason', 'needsReview'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    parsed.sentences = rawSentences;
    parsed.metrics = {
      writing: {
        charCount,
        sentenceCount,
        avgSentenceLen,
      },
    };

    if (parsed.criteria && assessment.criteria) {
      parsed.criteria = parsed.criteria.map((c: any, idx: number) => {
        const matching = assessment.criteria.find((ac: any) => ac.name === c.name) || assessment.criteria[idx];
        return {
          ...c,
          criterionId: matching ? matching.id : (c.criterionId || `crit-${idx}`),
        };
      });
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('Grade writing error:', error);
    return res.status(500).json({ error: error.message || '쓰기 AI 채점 실패' });
  }
});

// 4. Combined assessment grading endpoint (Speaking + Writing)
app.post('/api/grade/both', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType, writtenText, assessment, studentName } = req.body;

    const rawSentences = (writtenText || '')
      .split(/(?<=[.?!])\s+|\n+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    const charCount = (writtenText || '').replace(/\s/g, '').length;
    const sentenceCount = rawSentences.length;
    const avgSentenceLen = sentenceCount > 0 ? Math.round(charCount / sentenceCount) : 0;

    if (!aiClient) {
      return res.json({
        transcript: [
          { start_sec: 0, end_sec: 5, text: 'Hello, this is my presentation on modern technology.' },
          { start_sec: 6, end_sec: 14, text: 'Artificial intelligence can help solve difficult environmental problems.' },
          { start_sec: 15, end_sec: 22, text: 'In my essay, I also wrote about ethical considerations.' },
        ],
        fillers: 1,
        sentences: rawSentences,
        criteria: (assessment.criteria || []).map((c: any, idx: number) => ({
          criterionId: c.id,
          name: c.name,
          score: c.levels?.high?.score || 5,
          level: '상',
          reason: '말하기 발표와 작성한 성찰문이 상호 보완적으로 잘 연계되어 과제를 훌륭히 수행함.',
          evidenceSpeaking: [{ start_sec: 6, end_sec: 14 }],
          evidenceWriting: [{ sentence_index: 0 }],
        })),
        overall_confidence: '높음',
        confidence_reason: '말하기와 쓰기 양쪽 제출물 모두 완성도가 높고 상호 일관성이 우수함.',
        needsReview: false,
        metrics: {
          speaking: { durationSec: 22, wpm: 110, fillersCount: 1 },
          writing: { charCount, sentenceCount, avgSentenceLen },
        },
      });
    }

    const sentencesNumbered = rawSentences.map((s: string, idx: number) => `[글 문장 ${idx}] ${s}`).join('\n');
    const criteriaListText = JSON.stringify(assessment.criteria, null, 2);

    const systemInstruction = `당신은 대한민국 중·고등학교 수행평가 전문 AI 채점 도우미입니다.
학생은 '말하기(녹음 오디오)'와 '쓰기(글)' 두 가지를 모두 제출했습니다.
각 루브릭 항목은 target 필드('speaking', 'writing', 'both')를 가지고 있습니다.
- 'speaking' 기준: 오디오 발화 내용을 근거(evidenceSpeaking: [{ start_sec, end_sec }])로 채점
- 'writing' 기준: 작성된 글을 근거(evidenceWriting: [{ sentence_index }])로 채점
- 'both' 기준: 말하기 발화와 글 내용을 종합 평가하여 양쪽 근거를 모두 제시
반드시 오디오 전사(transcript: [{ start_sec, end_sec, text }])와 군더더기어 개수(fillers)도 함께 작성하십시오.`;

    const promptText = `과제 안내문: ${assessment.prompt}
성취기준: ${assessment.achievementStandard || '해당 성취기준'}
루브릭 목록:
${criteriaListText}

학생이 작성한 글:
${sentencesNumbered}

오디오와 글을 종합 분석하여 JSON 스키마에 맞게 결과를 반환하십시오.`;

    const contents: any[] = [];
    if (audioBase64) {
      contents.push({
        inlineData: {
          mimeType: mimeType || 'audio/webm',
          data: audioBase64,
        },
      });
    }
    contents.push({ text: promptText });

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  start_sec: { type: Type.NUMBER },
                  end_sec: { type: Type.NUMBER },
                  text: { type: Type.STRING },
                },
                required: ['start_sec', 'end_sec', 'text'],
              },
            },
            fillers: { type: Type.INTEGER },
            criteria: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  criterionId: { type: Type.STRING },
                  name: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  level: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  evidenceSpeaking: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        start_sec: { type: Type.NUMBER },
                        end_sec: { type: Type.NUMBER },
                      },
                      required: ['start_sec', 'end_sec'],
                    },
                  },
                  evidenceWriting: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        sentence_index: { type: Type.INTEGER },
                      },
                      required: ['sentence_index'],
                    },
                  },
                },
                required: ['name', 'score', 'level', 'reason'],
              },
            },
            overall_confidence: { type: Type.STRING },
            confidence_reason: { type: Type.STRING },
            needsReview: { type: Type.BOOLEAN },
            needsReviewReason: { type: Type.STRING },
          },
          required: ['transcript', 'criteria', 'overall_confidence', 'confidence_reason', 'needsReview'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    parsed.sentences = rawSentences;

    const lastSec = (parsed.transcript || []).reduce((max: number, curr: any) => Math.max(max, curr.end_sec || 0), 0);
    const totalWords = (parsed.transcript || []).reduce((acc: number, curr: any) => acc + (curr.text ? curr.text.trim().split(/\s+/).length : 0), 0);
    const durationMin = Math.max(0.1, lastSec / 60);

    parsed.metrics = {
      speaking: {
        durationSec: Math.round(lastSec),
        wpm: Math.round(totalWords / durationMin),
        fillersCount: parsed.fillers || 0,
      },
      writing: {
        charCount,
        sentenceCount,
        avgSentenceLen,
      },
    };

    if (parsed.criteria && assessment.criteria) {
      parsed.criteria = parsed.criteria.map((c: any, idx: number) => {
        const matching = assessment.criteria.find((ac: any) => ac.name === c.name) || assessment.criteria[idx];
        return {
          ...c,
          criterionId: matching ? matching.id : (c.criterionId || `crit-${idx}`),
        };
      });
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('Grade both error:', error);
    return res.status(500).json({ error: error.message || '복합 AI 채점 실패' });
  }
});

// 5. School record (세특) draft generation endpoint
app.post('/api/record/generate', async (req: Request, res: Response) => {
  try {
    const { studentName, subject, assessmentTitle, achievementStandard, contentSummary, scoresSummary, targetLength } = req.body;

    const charLimit = targetLength || 300;

    if (!aiClient) {
      return res.json({
        draft: `'${assessmentTitle}' 수행평가에서 ${contentSummary ? contentSummary.slice(0, 50) : '주제'}에 관해 논리적인 근거를 바탕으로 자신의 견해를 조리 있게 발표함. 핵심 주제를 일관되게 전개하며 과제 요구사항을 성실하게 수행하였고, 학습한 표현을 상황에 알맞게 구사하여 청중의 이해를 높임.`,
      });
    }

    const systemInstruction = `당신은 대한민국 학교생활기록부 교과 세부능력 및 특기사항(세특) 전문 작성 어시스턴트입니다.
반드시 지켜야 할 원칙:
1. 어조: 문장 끝을 '~함', '~하였음' 형태의 공식 학생부 서술체로 일관되게 종결하십시오.
2. 사실 기반: 학생이 실제로 말하거나 쓴 내용에서 구체적인 활동과 성취 근거를 인용하십시오. 절대 하지 않은 내용을 지어내지 마십시오.
3. 기재 금지 사항 배제:
   - 과도하거나 막연한 칭찬 지양 (구체적 행위와 성취 위주)
   - 특정 기관명, 상호명, 사교육 기관명 기재 금지
   - 학생 이름이나 개인 식별 정보는 생략하거나 '학생' 등으로 일반화
   - 공인어학시험 성적, 교내외 수상 실적, 인증 시험 기재 절대 금지
4. 분량: 공백 포함 약 ${charLimit}자 내외로 작성하십시오.`;

    const promptText = `과목: ${subject || '영어'}
수행평가명: ${assessmentTitle}
성취기준: ${achievementStandard || '해당 성취기준'}
학생 발표/작성 핵심 내용:
${contentSummary || '자신의 생각을 논리적으로 서술함'}

교사 승인/평가 요약:
${scoresSummary || '우수한 성취'}

위 정보를 바탕으로 학교생활기록부 세특 문장 초안을 작성해 주십시오. 텍스트만 깔끔하게 출력하십시오.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const draft = (response.text || '').trim();
    return res.json({ draft });
  } catch (error: any) {
    console.error('Record generate error:', error);
    return res.status(500).json({ error: error.message || '세특 초안 생성 실패' });
  }
});

// Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
