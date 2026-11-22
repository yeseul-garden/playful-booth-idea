// Explicit preview only. Never mixed into connected Google Form records.
const messages=[
  ['회의가 끝나면 AI가 결정 사항과 담당자를 정리해서 바로 공유해주면 좋겠어요.','eden.choi'],
  ['직무별로 바로 복사해서 쓸 수 있는 프롬프트 모음이 있으면 좋겠습니다!','ashley.jeon'],
  ['반복되는 엑셀 작업, AI로 10분 만에 끝내는 꿀팁을 배우고 싶어요.','alex.kim'],
  ['우리 팀만의 AI 활용 사례를 서로 나누는 공간은 어떨까요?','june.park'],
  ['처음 시작하는 사람을 위한 작은 실습 가이드가 필요해요. 하루에 하나씩!','milo.lee'],
  ['긴 문서를 읽고 핵심을 요약하는 나만의 업무 도우미를 만들고 싶어요.','sophie.han'],
  ['AI가 만든 답변을 어떻게 검증하면 좋을지, 실제 예시로 알려주세요.','leo.jung'],
  ['좋은 프롬프트에는 좋은 맥락이 필요하다! 맥락을 잘 쓰는 방법이 궁금해요.','aria.kang'],
  ['자주 쓰는 AI 도구를 업무 상황별로 찾아볼 수 있으면 편하겠어요.',''],
  ['아이디어를 바로 작은 프로토타입으로 만들어 보는 워크숍을 열어주세요.','noah.song'],
  ['AI와 함께 쓰는 이메일, 짧고 명확하게 다듬는 법을 공유하고 싶어요.','ella.lim'],
  ['개발자가 아니어도 자동화할 수 있는 업무가 생각보다 많을 것 같아요.','ryan.yoo'],
  ['실패한 시도도 모아보면 좋은 학습 자료가 되지 않을까요?','chloe.oh'],
  ['나에게 맞는 AI 학습 경로를 추천해주면 좋겠습니다.','owen.bae'],
  ['데이터를 차트로 표현할 때 어떤 질문부터 해야 할까요?','luna.shin'],
  ['작은 업무 하나부터 AI로 바꿔보고 그 경험을 기록하는 챌린지를 해봐요!','jay.hong'],
];
export const sampleSnapshot=()=>({ok:true,items:messages.map(([message,author],index)=>({id:`demo-${index}`,submittedAt:new Date(2026,10,22,10,index).toISOString(),message,author}))});
export const incomingSamples=[['이렇게 모두의 아이디어가 실시간으로 모이니까 다음 시도가 기대돼요!','eden.choi'],['나의 작은 꿀팁이 누군가의 퇴근을 조금 앞당길 수 있기를 ✨','new.crew'],['긴 보고서도 한눈에! AI로 핵심을 정리하는 템플릿을 나눠주세요.','']];
