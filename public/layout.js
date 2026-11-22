// All height budgets come from the available grid cell, never from clamped text.
export function planWallLayout({width,height,count}) {
  const gap=width<600?20:width<1200?28:40;
  const minWidth=width<600?260:300;
  const columns=Math.max(1,Math.min(4,Math.floor((width+gap)/(minWidth+gap))));
  const preferredFont=Math.max(20,Math.min(44,Math.round(width/64)));
  const minCardHeight=Math.max(240,preferredFont*7.6);
  const rows=Math.max(1,Math.min(3,Math.floor((height+gap)/(minCardHeight+gap))));
  const cellHeight=Math.max(96,(height-gap*(rows-1))/rows);
  return {columns,rows,capacity:columns*rows,gap,preferredFont,cellHeight,cardMaxHeight:Math.max(80,cellHeight-24)};
}
export function textLineBudget({cardHeight,paddingTop,paddingBottom,metaHeight,gap,lineHeight}) {
  return Math.max(1,Math.floor((cardHeight-paddingTop-paddingBottom-metaHeight-gap)/lineHeight));
}
