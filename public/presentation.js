export const QUESTION_PLACEHOLDER="내 업무에서 AI로 가장 먼저 해결하고 싶은 '귀찮은 일'이나, Self-Learning에 꼭 추가됐으면 하는 '꿀팁/가이드'를 한 줄로 적어주세요!";
export const RESPONSE_COLORS=Object.freeze(['#61C3DE','#A5C852','#FFEB4B','#FF8F8F','#FFF4E0']);
export const cardColor=position=>RESPONSE_COLORS[((position%RESPONSE_COLORS.length)+RESPONSE_COLORS.length)%RESPONSE_COLORS.length];
