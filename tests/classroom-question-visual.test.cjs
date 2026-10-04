const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'kid.js'),'utf8');
const context={window:{},state:{},esc:text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'courses.js'),'utf8'),context);
for(const name of ['visualParts','courseVisual','renderClassroom']){
  const start=source.indexOf(`function ${name}(`),end=source.indexOf('\nfunction ',start+1);
  assert.ok(start>=0);
  vm.runInContext(source.slice(start,end),context);
}
const courses=context.window.GRADE_ONE_COURSES;
function picture(course,step){
  context.state={course,courseStep:step,courseAnswered:false};
  return context.renderClassroom().match(/<div class="lesson-visual[^\"]*">([\s\S]*?)<\/div>/)[1];
}

test('counting switches from five teaching apples to three question stars and back',()=>{
  const course=courses.find(x=>x.subject==='数学'&&x.title==='数一数');
  assert.ok(picture(course,0).includes('🍎🍎🍎🍎🍎'));
  assert.ok(picture(course,1).includes('🍎🍎🍎🍎🍎'));
  assert.ok(picture(course,2).includes('⭐⭐⭐'));
  assert.ok(!picture(course,2).includes('🍎'));
  assert.ok(picture(course,1).includes('🍎🍎🍎🍎🍎'));
});

test('language and equation questions show the actual question without revealing the chosen answer',()=>{
  const language=courses.find(x=>x.subject==='语文'&&x.title==='快乐上学');
  const html=picture(language,2);
  assert.ok(html.includes(language.question));
  assert.ok(!html.includes('你好'));
  assert.ok(!html.includes(language.choices[language.answer]));
  const equation=courses.find(x=>x.subject==='数学'&&/9/.test(x.question)&&/2/.test(x.question)&&!x.quizVisual);
  assert.ok(equation);
  assert.ok(picture(equation,2).includes(equation.question));
  assert.equal(context.courseVisual({...language,quizVisual:'   '},2),language.question);
});

test('question illustrations are complete for all five picture-based math prompts',()=>{
  const expected={'数一数':'⭐⭐⭐','比多少':'🍎🍎　🍌🍌','认识1—5':'🐟🐟🐟🐟','认识加法':'🐰🐰　＋　🐰','找规律':'⭐🌙⭐🌙　？'};
  assert.equal(courses.length,60);
  for(const [title,visual] of Object.entries(expected)){
    const course=courses.find(x=>x.subject==='数学'&&x.title===title);
    assert.equal(context.courseVisual(course,2),visual,title);
  }
});
