export const DEFAULT_TITLE='아이디어 보드';
export const normalizeTitle=value=>String(value??'').trim().slice(0,80);
export function validStoredIcon(value){return typeof value==='string'&&value.length<=400000&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value)?value:'';}
export async function prepareIcon(file) {
  if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('PNG, JPG 또는 WebP 이미지를 선택해주세요.');
  if(file.size>5*1024*1024)throw new Error('5MB 이하의 이미지를 선택해주세요.');
  const url=URL.createObjectURL(file);
  try{
    const image=new Image();image.src=url;await image.decode();
    if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth>8192||image.naturalHeight>8192)throw new Error('가로·세로 8,192px 이하의 이미지를 선택해주세요.');
    const canvas=document.createElement('canvas');const scale=Math.min(1,256/Math.max(image.naturalWidth,image.naturalHeight));
    canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    const result=canvas.toDataURL('image/png');if(!validStoredIcon(result))throw new Error('이미지가 너무 복잡합니다. 더 작은 이미지를 선택해주세요.');return result;
  }catch(error){if(error.message.includes('선택해주세요'))throw error;throw new Error('이미지를 읽지 못했습니다. 다른 파일을 선택해주세요.');}
  finally{URL.revokeObjectURL(url);}
}
