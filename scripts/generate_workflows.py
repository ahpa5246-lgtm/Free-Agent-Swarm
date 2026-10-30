import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'n8n/workflows'
root.mkdir(parents=True,exist_ok=True)
def node(name, kind, x, y, params, version=1):
    return {'name':name,'type':'n8n-nodes-base.'+kind,'typeVersion':version,'position':[x,y],'parameters':params,'id':name.lower().replace(' ','-')}
validate='''const body = $input.first().json.body ?? {};
const task = typeof body.task === 'string' ? body.task.trim().slice(0,2000) : '';
const repository = typeof body.repository === 'string' ? body.repository.trim().slice(0,120) : '';
if (!task || !/^[A-Za-z0-9_.-]+\\/[A-Za-z0-9_.-]+$/.test(repository)) {
  return [{json:{ok:false,status:'rejected',error:'Valid task and owner/repository are required'}}];
}
return [{json:{ok:true,status:'validated',task,repository,mode:'planning-only',note:'No repository writes or code execution'}}];'''
route='''const input = $input.first().json;
const valid = $('Validate Input').first().json;
const code = Number(input.statusCode ?? 0);
const body = input.body ?? {};
const completion = body?.choices?.[0]?.message?.content;
if (code >= 200 && code < 300 && typeof completion === 'string' && completion.trim()) {
 return [{json:{ok:true,status:'planned',provider:'openrouter',repository:valid.repository,task:valid.task,proposal:completion.slice(0,12000),mode:'planning-only',handoff:false}}];
}
return [{json:{ok:false,status:'provider_error',provider:'openrouter',code,canFallback:[429,503].includes(code),error:'Provider response unusable',mode:'planning-only'}}];'''
route2='''const result=$input.first().json;
const code=Number(result.statusCode??0);
const completion=result.body?.choices?.[0]?.message?.content;
const valid=$('Validate Input').first().json;
if(code>=200 && code<300 && typeof completion==='string' && completion.trim()) {
 return [{json:{ok:true,status:'planned',provider:'groq',repository:valid.repository,task:valid.task,proposal:completion.slice(0,12000),mode:'planning-only',handoff:true}}];
}
return [{json:{ok:false,status:'blocked',code,reason:'No available authorized free-tier provider',handoff:true,mode:'planning-only'}}];'''

# A safe workflow that requires credentials before activation and performs no code execution.
nodes=[
node('Task Webhook','webhook',180,300,{'httpMethod':'POST','path':'free-agent-swarm-plan','responseMode':'responseNode','authentication':'headerAuth','options':{}},2),
node('Validate Input','code',400,300,{'mode':'runOnceForAllItems','jsCode':validate},2),
node('Input Valid?','if',620,300,{'conditions':{'options':{'caseSensitive':True,'leftValue':'','typeValidation':'strict'},'combinator':'and','conditions':[{'id':'input-ok','leftValue':'={{ $json.ok }}','rightValue':True,'operator':{'type':'boolean','operation':'true'}}]}},2),
node('OpenRouter Free','httpRequest',860,210,{'method':'POST','url':'https://openrouter.ai/api/v1/chat/completions','authentication':'genericCredentialType','genericAuthType':'httpHeaderAuth','sendHeaders':True,'headerParameters':{'parameters':[{'name':'Content-Type','value':'application/json'}]},'sendBody':True,'specifyBody':'json','jsonBody':"={{ JSON.stringify({model:'openrouter/free', messages:[{role:'system',content:'Create a concise technical implementation plan, no invented test results or PR claims. Do not output secrets.'},{role:'user',content: $('Validate Input').first().json.task}],temperature:0.2,max_tokens:900}) }}",'options':{'response':{'response':{'fullResponse':True,'neverError':True,'responseFormat':'json'}}}},4.2),
node('Check OpenRouter','code',1090,210,{'mode':'runOnceForAllItems','jsCode':route},2),
node('Plan Ready?','if',1330,210,{'conditions':{'options':{'caseSensitive':True,'leftValue':'','typeValidation':'strict'},'combinator':'and','conditions':[{'id':'ready','leftValue':'={{ $json.ok }}','rightValue':True,'operator':{'type':'boolean','operation':'true'}}]}},2),
node('Can Fallback?','if',1540,350,{'conditions':{'options':{'caseSensitive':True,'leftValue':'','typeValidation':'strict'},'combinator':'and','conditions':[{'id':'fallback','leftValue':'={{ $json.canFallback }}','rightValue':True,'operator':{'type':'boolean','operation':'true'}}]}},2),
node('Groq Backup','httpRequest',1760,270,{'method':'POST','url':'https://api.groq.com/openai/v1/chat/completions','authentication':'genericCredentialType','genericAuthType':'httpHeaderAuth','sendHeaders':True,'headerParameters':{'parameters':[{'name':'Content-Type','value':'application/json'}]},'sendBody':True,'specifyBody':'json','jsonBody':"={{ JSON.stringify({model:'openai/gpt-oss-120b',messages:[{role:'system',content:'Provide a concise implementation plan. Do not claim code changes or tests.'},{role:'user',content: $('Validate Input').first().json.task}],temperature:0.2,max_tokens:900}) }}",'options':{'response':{'response':{'fullResponse':True,'neverError':True,'responseFormat':'json'}}}},4.2),
node('Check Groq','code',1980,270,{'mode':'runOnceForAllItems','jsCode':route2},2),
node('Groq Success?','if',2150,325,{'conditions':{'options':{'caseSensitive':True,'leftValue':'','typeValidation':'strict'},'combinator':'and','conditions':[{'id':'groq-ok','leftValue':'={{ $json.ok }}','rightValue':True,'operator':{'type':'boolean','operation':'true'}}]}},2),
node('Respond Result','respondToWebhook',2210,210,{'respondWith':'firstIncomingItem','options':{}},1.4),
node('Respond Rejected','respondToWebhook',870,500,{'respondWith':'firstIncomingItem','options':{'responseCode':400}},1.4),
node('Respond Blocked','respondToWebhook',1770,480,{'respondWith':'firstIncomingItem','options':{'responseCode':503}},1.4),
]
connections={
'Task Webhook':{'main':[[{'node':'Validate Input','type':'main','index':0}]]},
'Validate Input':{'main':[[{'node':'Input Valid?','type':'main','index':0}]]},
'Input Valid?':{'main':[[{'node':'OpenRouter Free','type':'main','index':0}],[{'node':'Respond Rejected','type':'main','index':0}]]},
'OpenRouter Free':{'main':[[{'node':'Check OpenRouter','type':'main','index':0}]]},
'Check OpenRouter':{'main':[[{'node':'Plan Ready?','type':'main','index':0}]]},
'Plan Ready?':{'main':[[{'node':'Respond Result','type':'main','index':0}],[{'node':'Can Fallback?','type':'main','index':0}]]},
'Can Fallback?':{'main':[[{'node':'Groq Backup','type':'main','index':0}],[{'node':'Respond Blocked','type':'main','index':0}]]},
'Groq Backup':{'main':[[{'node':'Check Groq','type':'main','index':0}]]},
'Check Groq':{'main':[[{'node':'Groq Success?','type':'main','index':0}]]},
'Groq Success?':{'main':[[{'node':'Respond Result','type':'main','index':0}],[{'node':'Respond Blocked','type':'main','index':0}]]}
}
# Groq failure returns structured JSON 200 (rather than 503), for demo transparency.
workflow={'name':'Free Agent Swarm — Safe free-tier planning failover (manual setup)','nodes':nodes,'connections':connections,'active':False,'settings':{'executionOrder':'v1'},'pinData':{},'meta':{'templateCredsSetupCompleted':False},'tags':[]}
(root/'planning-failover.json').write_text(json.dumps(workflow,indent=2,ensure_ascii=False)+'\n')

code='''const input = $input.first().json;
const task = 'Audit the sample repository and prepare a safe review plan';
const records = [
  {stage:1,agent:'Codex',event:'Accepted mock task'},
  {stage:2,agent:'Codex',event:'Simulated repo analysis finished'},
  {stage:3,agent:'Codex',event:'Simulated quota exhausted (429)'},
  {stage:4,agent:'DeepSeek',event:'Checkpoint handoff completed'},
  {stage:5,agent:'DeepSeek',event:'Mock implementation notes prepared'},
  {stage:6,agent:'Gemini',event:'Mock validation passed'},
  {stage:7,agent:'Supervisor',event:'Awaiting human review (no PR created)'}
];
return [{json:{mode:'simulation',task,events:records,modelCalls:0,repositoryWrites:0,paidCalls:0}}];'''
sim={'name':'Free Agent Swarm — Zero-key offline simulation','nodes':[node('When clicked','manualTrigger',200,300,{},1),node('Simulate Handoff','code',430,300,{'mode':'runOnceForAllItems','jsCode':code},2)],'connections':{'When clicked':{'main':[[{'node':'Simulate Handoff','type':'main','index':0}]]}},'active':False,'settings':{'executionOrder':'v1'},'pinData':{},'tags':[]}
(root/'zero-key-simulation.json').write_text(json.dumps(sim,indent=2,ensure_ascii=False)+'\n')
print('Generated 2 importable n8n workflows')
