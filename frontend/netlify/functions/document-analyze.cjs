const { json, bodyJson, getAuthenticatedUser } = require('./_shared.cjs');
const { rest } = require('./_server-data.cjs');

const ALLOWED_CATEGORIES = ['Medical', 'MVR', 'CDL', 'Application', 'Verification', 'RoadTest', 'DrugAlcohol', 'Clearinghouse', 'Custom'];

function parseJson(text) {
  const cleaned = String(text || '').replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI did not return structured document data.');
  return JSON.parse(match[0]);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'POST') return json(405, { detail: 'Method not allowed.' });
  const user = await getAuthenticatedUser(event);
  if (!user) return json(401, { detail: 'Sign in before analyzing documents.' });
  if (!process.env.OPENAI_API_KEY) return json(503, { detail: 'Add OPENAI_API_KEY in Netlify to enable LlamaIndex document parsing.' });
  try {
    const body = await bodyJson(event);
    const bytes = Buffer.from(String(body.data_base64 || ''), 'base64');
    if (!bytes.length || bytes.length > 4 * 1024 * 1024) return json(400, { detail: 'Documents must be between 1 byte and 4 MB.' });
    let documentText = '';
    if (String(body.content_type).includes('pdf') || String(body.file_name).toLowerCase().endsWith('.pdf')) {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: bytes });
      const parsed = await parser.getText();
      documentText = parsed.text || '';
      await parser.destroy();
    } else if (/text|json|csv|xml/.test(String(body.content_type || ''))) {
      documentText = bytes.toString('utf8');
    }
    documentText = documentText.slice(0, 60000);
    const { openai } = await import('@llamaindex/openai');
    const llm = openai({ model: process.env.LLAMAINDEX_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini', apiKey: process.env.OPENAI_API_KEY, temperature: 0 });
    const prompt = `You label and parse trucking compliance documents for safe data entry. Return ONLY valid JSON.
Allowed category values: ${ALLOWED_CATEGORIES.join(', ')}.
Schema: {"category":"Medical","confidence":0.0,"document_title":"","expiration_date":null,"issue_date":null,"fields":{"full_name":null,"license_number":null,"cdl_state":null,"dot_number":null,"mc_number":null,"medical_expiration":null,"cdl_expiration":null,"drug_test_date":null},"warnings":[]}
Never invent a value. Use null when absent. Dates must be YYYY-MM-DD. Filename: ${String(body.file_name || 'document')}
Document text:
${documentText || '[No machine-readable text was available. Classify conservatively from the filename and return a warning.]'}`;
    const completion = await llm.complete({ prompt });
    const result = parseJson(completion.text || completion.message?.content || completion.toString());
    if (!ALLOWED_CATEGORIES.includes(result.category)) result.category = 'Custom';
    result.confidence = Math.max(0, Math.min(1, Number(result.confidence || 0)));
    await rest('tms_document_extractions', {
      method: 'POST', body: JSON.stringify({ owner_id: user.id, file_name: body.file_name || 'document', category: result.category, confidence: result.confidence, extracted_data: result }),
    });
    return json(200, result);
  } catch (error) {
    return json(500, { detail: error.message || 'LlamaIndex could not analyze this document.' });
  }
};
