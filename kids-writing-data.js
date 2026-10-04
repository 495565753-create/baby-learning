/* Original digit tracing geometry and child-friendly teacher copy.
 * Sources reviewed on 2026-10-04:
 * https://cdn.oxfordowl.co.uk/2013/07/18/15/54/56/399/OxOwl_Writing_numbers.pdf
 *   Oxford University Press: 0–9 handwriting shapes, oval proportion guides, easier-first practice.
 *   This worksheet has no stroke-direction arrows and does not establish a Chinese national stroke-order standard.
 * https://www.moe.gov.cn/srcsite/A26/s8001/201301/t20130125_147389.html
 *   Ministry of Education: age-appropriate writing, basic strokes, structure and grid practice.
 * The paths below use a common preschool handwriting convention, not a claim of a particular Zhejiang textbook:
 * 1/2/3/6/7/8/9 are one continuous stroke; open 4 is slant-and-across, then down;
 * 5 is down-and-around, then its top bar; 10 is an independent 1 followed by a closed, unslashed 0.
 * All artwork, wording, Bezier control points and sampled traces are original.
 */
(function (global) {
  'use strict';
  const COORDINATE_SIZE = 400;
  const SPELLED = ['','一','二','三','四','五','六','七','八','九','十'];
  const segments = {
    '0': [['M',235,78],['C',168,46,124,102,121,193],['C',118,281,150,335,205,330],['C',265,324,281,244,278,163],['C',275,110,260,91,235,78]],
    '1': [['M',200,77],['L',200,324]],
    '2': [['M',126,126],['C',130,77,235,60,269,102],['C',309,150,240,193,193,233],['L',124,321],['L',282,321]],
    '3': [['M',126,112],['C',174,55,276,77,273,133],['C',270,173,231,186,199,188],['C',251,184,293,221,275,270],['C',257,333,163,339,119,288]],
    '4': [ [['M',235,80],['L',120,245],['L',282,245]], [['M',245,155],['L',245,325]] ],
    '5': [ [['M',140,82],['L',130,198],['C',168,179,257,182,275,237],['C',303,313,208,358,129,301]], [['M',140,82],['L',278,82]] ],
    '6': [['M',267,84],['C',185,91,127,181,128,253],['C',130,331,252,349,279,279],['C',307,204,204,173,134,232]],
    '7': [['M',121,80],['L',286,80],['L',172,325]],
    '8': [['M',250,84],['C',194,48,122,74,134,139],['C',149,179,239,192,271,250],['C',302,319,206,365,146,311],['C',87,241,190,197,239,160],['C',287,122,279,94,250,84]],
    '9': [['M',268,158],['C',273,91,229,63,178,79],['C',126,95,111,166,157,190],['C',210,217,265,197,268,158],['C',274,209,260,273,240,325]]
  };
  function sample(commands, transform = p => p) {
    const result = []; let current = null;
    function append(p) {
      const next=transform(p), previous=result[result.length-1];
      if(previous){const gap=Math.hypot(next[0]-previous[0],next[1]-previous[1]),parts=Math.max(1,Math.ceil(gap/8));for(let i=1;i<=parts;i++)result.push([+(previous[0]+(next[0]-previous[0])*i/parts).toFixed(3),+(previous[1]+(next[1]-previous[1])*i/parts).toFixed(3)]);}
      else result.push(next.map(n=>+n.toFixed(3)));
    }
    for(const command of commands){const kind=command[0];if(kind==='M'){current=[command[1],command[2]];append(current);}
      else if(kind==='L'){current=[command[1],command[2]];append(current);}
      else if(kind==='C'){const start=current,a=[command[1],command[2]],b=[command[3],command[4]],end=[command[5],command[6]];
        for(let i=1;i<=64;i++){const t=i/64,s=1-t;append([s*s*s*start[0]+3*s*s*t*a[0]+3*s*t*t*b[0]+t*t*t*end[0],s*s*s*start[1]+3*s*s*t*a[1]+3*s*t*t*b[1]+t*t*t*end[1]]);}current=end;
      }
    }
    return result;
  }
  function path(commands, transform = p => p) { return commands.map(command=>{const values=[];for(let i=1;i<command.length;i+=2)values.push(...transform([command[i],command[i+1]]).map(n=>+n.toFixed(3)));return command[0]+' '+values.join(' ');}).join(' '); }
  function stroke(commands, hint, transform) {return {points:sample(commands,transform),path:path(commands,transform),hint};}
  const hints = {
    1:['从上面的小点开始，直直地往下写。'],
    2:['从左上小点开始，向右弯个弧，斜着走到左下，再向右写平。'],
    3:['从左上小点开始，先向右画上面的弯，再接着画下面的弯。'],
    4:['先从上面的小点斜着往左下走，再向右写平。','抬起手指，从第二个小点开始，往下写一条直线。'],
    5:['从左上小点往下走，再向右绕出下面的大弯。','抬起手指，回到上面的小点，向右写一条短横线。'],
    6:['从右上小点开始，向左下慢慢弯，再绕出下面的小圈。'],
    7:['从左上小点开始，先向右写平，再斜着往左下走。'],
    8:['从右上小点开始，先向左绕，交叉向右下，再绕回来，向右上绕回起点。'],
    9:['从右边的小点开始，向左绕出上面的小圈，回到右边，再往下写。'],
    10:['先在左边写一个一，从上面的小点直直往下走。','抬起手指，到右边的小点。先向左绕，再往下绕，绕一个闭合的零。']
  };
  const meanings = {
    1:'我们再认识汉字，一。一表示一个。这里有一个苹果，我们一起数，一。',
    2:'我们再认识汉字，二。二表示两个。这里有两只小鸭，我们一起数，一，二。',
    3:'我们再认识汉字，三。三表示三个。这里有三朵小花，我们一起数，一，二，三。',
    4:'我们再认识汉字，口。口就是嘴巴。我们用嘴巴说话、吃东西。张开小嘴，笑一笑。',
    5:'我们再认识汉字，手。手可以拿东西，也可以画画。看看自己的小手，伸开五根手指。',
    6:'我们再认识汉字，日。日可以表示太阳，也可以表示一天。日出的意思是太阳升起来。',
    7:'我们再认识汉字，月。月可以表示月亮，也可以表示月份。晚上找一找天上的月亮。',
    8:'我们再认识汉字，人。你是一个小朋友，老师和家人也都是人。大家可以互相帮助。',
    9:'我们再认识汉字，大。大象的身体很大。看看大象和小兔，它们的大小不一样。',
    10:'我们再认识汉字，十。十表示十个。伸开两只小手，一共十根手指。数字十由一和零组成。'
  };
  const chars = ['', '一','二','三','口','手','日','月','人','大','十'];
  const pinyin = ['', 'yī','èr','sān','kǒu','shǒu','rì','yuè','rén','dà','shí'];
  const characterIcons = ['', '🍎','🦆','🌸','👄','🖐️','☀️','🌙','👧','🐘','🙌'];
  const counts = [null,
    {emoji:'🍎',name:'苹果',unit:'个'}, {emoji:'🦆',name:'小鸭',unit:'只'}, {emoji:'🌸',name:'小花',unit:'朵'},
    {emoji:'🦋',name:'蝴蝶',unit:'只'}, {emoji:'⭐',name:'星星',unit:'颗'}, {emoji:'🍓',name:'草莓',unit:'颗'},
    {emoji:'🐟',name:'小鱼',unit:'条'}, {emoji:'🍊',name:'橘子',unit:'个'}, {emoji:'🎈',name:'气球',unit:'个'},
    {emoji:'🍀',name:'小叶子',unit:'片'}
  ];
  function artwork(char) {
    const start='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160" role="img"><rect width="200" height="160" rx="25" fill="#f1f8fc"/><g stroke="#446882" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">',end='</g></svg>';
    const bodies={
      '一':'<path d="M55 72 C49 54 70 39 94 49 C124 31 150 57 145 76 C163 112 132 140 104 130 C71 142 44 112 55 72Z" fill="#ee7786"/><path d="M99 52L104 32"/><path d="M107 36Q129 15 145 31Q126 51 107 36Z" fill="#8bc298"/>',
      '二':'<path d="M22 102Q37 74 61 100L63 64Q62 41 85 44Q106 45 106 66L129 73L107 82L100 111Q70 145 32 116Z" fill="#f8d77e"/><circle cx="87" cy="60" r="3" fill="#446882" stroke="none"/><path d="M122 122Q134 97 158 118L158 88Q158 73 173 77Q187 82 181 100L195 103L180 111L177 127Q148 144 125 134Z" fill="#a7cfdf"/>',
      '三':'<path d="M49 99L49 143M103 96L103 143M154 99L154 143" stroke="#7aab87"/><g fill="#edb4cf"><circle cx="49" cy="51" r="17"/><circle cx="31" cy="70" r="17"/><circle cx="66" cy="70" r="17"/><circle cx="103" cy="51" r="17"/><circle cx="85" cy="70" r="17"/><circle cx="120" cy="70" r="17"/><circle cx="154" cy="51" r="17"/><circle cx="136" cy="70" r="17"/><circle cx="171" cy="70" r="17"/></g><g fill="#ffdc76"><circle cx="49" cy="72" r="14"/><circle cx="103" cy="72" r="14"/><circle cx="154" cy="72" r="14"/></g>',
      '口':'<path d="M29 78Q55 48 77 61Q101 42 126 62Q148 49 172 78Q147 111 101 116Q57 115 29 78Z" fill="#efb1bd"/><path d="M39 80Q101 89 163 80Q136 103 101 104Q65 104 39 80Z" fill="#fffaf6"/>',
      '手':'<path d="M59 123L38 94Q28 77 44 73Q51 72 61 84L57 43Q55 29 68 30Q80 30 79 44L82 79L84 26Q84 13 96 14Q108 15 106 29L107 79L114 30Q116 18 129 23Q138 27 135 39L129 85L146 48Q151 37 163 44Q172 51 165 62L148 108Q139 140 113 145L74 146Z" fill="#f5d9c4"/>',
      '日':'<g stroke="#d7b15a"><path d="M100 15V30M100 130V145M35 80H20M165 80H180M54 34L44 24M146 34L156 24M54 126L44 136M146 126L156 136"/><circle cx="100" cy="80" r="46" fill="#f8d782"/></g><circle cx="85" cy="74" r="3" fill="#446882" stroke="none"/><circle cx="115" cy="74" r="3" fill="#446882" stroke="none"/><path d="M88 96Q100 106 113 95"/>',
      '月':'<path d="M123 18C82 34 79 94 131 119C82 152 32 112 37 68C43 30 85 7 123 18Z" fill="#f7dd92"/><path d="M154 47L159 57L171 59L162 67L163 79L152 73L142 78L144 66L136 57L149 55Z" fill="#bad6ee"/><circle cx="164" cy="119" r="5" fill="#bad6ee"/>',
      '人':'<circle cx="99" cy="45" r="27" fill="#f4d9c7"/><path d="M74 34Q96 7 124 34" fill="#6b657e"/><path d="M65 104Q65 72 100 72Q135 73 135 104L133 136H68Z" fill="#9fcad9"/><path d="M65 103L43 124M135 103L157 124M83 137V150M119 137V150"/><circle cx="90" cy="47" r="2" fill="#446882" stroke="none"/><circle cx="109" cy="47" r="2" fill="#446882" stroke="none"/><path d="M90 58Q100 65 109 58"/>',
      '大':'<path d="M30 82Q32 46 88 44Q140 44 147 72L163 75Q189 80 181 122Q174 139 157 129L161 113Q174 115 169 97L145 96L145 135H121V112H65V135H40V106Z" fill="#b6c9d7"/><ellipse cx="126" cy="73" rx="25" ry="31" fill="#d3dfe7"/><circle cx="153" cy="72" r="3" fill="#446882" stroke="none"/><path d="M6 112Q14 104 25 113L25 129H9Z" fill="#e9dce1"/>',
      '十':'<g fill="#f5d9c4"><path transform="translate(3 5) scale(.52 .9)" d="M59 123L38 94Q28 77 44 73Q51 72 61 84L57 43Q55 29 68 30Q80 30 79 44L82 79L84 26Q84 13 96 14Q108 15 106 29L107 79L114 30Q116 18 129 23Q138 27 135 39L129 85L146 48Q151 37 163 44Q172 51 165 62L148 108Q139 140 113 145L74 146Z"/><path transform="translate(197 5) scale(-.52 .9)" d="M59 123L38 94Q28 77 44 73Q51 72 61 84L57 43Q55 29 68 30Q80 30 79 44L82 79L84 26Q84 13 96 14Q108 15 106 29L107 79L114 30Q116 18 129 23Q138 27 135 39L129 85L146 48Q151 37 163 44Q172 51 165 62L148 108Q139 140 113 145L74 146Z"/></g>'
    };
    return start+bodies[char]+end;
  }
  const lessons=[];
  for(let number=1;number<=10;number++){
    let rows;
    if(number===10)rows=[stroke([['M',116,77],['L',116,324]],hints[10][0]),stroke(segments['0'],hints[10][1],([x,y])=>[110+x*.8,y])];
    else if(number===4||number===5)rows=segments[String(number)].map((commands,index)=>stroke(commands,hints[number][index]));
    else rows=[stroke(segments[String(number)],hints[number][0])];
    const character=chars[number],guide=`我们来写数字${SPELLED[number]}。先看小手怎么写，再从亮亮的小点开始，慢慢跟着画。`,meaning=meanings[number],completion=`数字${SPELLED[number]}，写好啦！你认真地完成了！`;
    lessons.push({id:'number-'+number,number,display:String(number),title:'数字'+number,label:'数字'+number,spokenName:SPELLED[number],coordinateSize:COORDINATE_SIZE,character,pinyin:pinyin[number],characterIcon:characterIcons[number],characterSvg:artwork(character),guide,meaning,counting:{...counts[number],count:number},strokes:rows,strokeHints:[...hints[number]],completion,word:{char:character,pinyin:pinyin[number],meaning,intro:meaning,icon:characterIcons[number],svg:artwork(character)}});
  }
  global.WRITING_LESSONS=lessons;
  global.WRITING_LESSON_TEXTS=[...new Set(lessons.flatMap(lesson=>[lesson.guide,...lesson.strokeHints,lesson.completion,lesson.meaning]))];
  global.WRITING_SOURCES={method:'通用儿童数字手写法，非指定教材笔顺标准',checked:'2026-10-04',links:[{title:'Oxford University Press — Numbers handwriting practice (字形参考，无笔順箭头)',url:'https://cdn.oxfordowl.co.uk/2013/07/18/15/54/56/399/OxOwl_Writing_numbers.pdf'},{title:'教育部《中小学书法教育指导纲要》（适龄练习原则）',url:'https://www.moe.gov.cn/srcsite/A26/s8001/201301/t20130125_147389.html'}]};
})(window);
