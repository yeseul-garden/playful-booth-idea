const viewer = document.querySelector('#screen-viewer');
const picture = document.querySelector('#screen-image');
const sizeButton = document.querySelector('#screen-size');
const scrollArea = viewer.querySelector('.viewer-scroll');
let opener;
function setOriginal(original) {
  viewer.classList.toggle('original-size', original);
  sizeButton.setAttribute('aria-pressed', String(original));
  sizeButton.textContent = original ? '화면에 맞춰 보기' : '원본 크기로 보기';
  scrollArea.scrollTo(0, 0);
}
for (const link of document.querySelectorAll('.screen-link')) {
  link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    opener = link;
    const source = link.querySelector('img');
    picture.src = link.href;
    picture.alt = source.alt;
    document.querySelector('#screen-title').textContent = source.alt;
    document.querySelector('#screen-caption').textContent = link.closest('figure').querySelector('figcaption').textContent;
    document.querySelector('#screen-file').href = link.href;
    setOriginal(false);
    viewer.showModal();
    document.body.classList.add('viewer-open');
  });
}
sizeButton.addEventListener('click', () => setOriginal(!viewer.classList.contains('original-size')));
document.querySelector('#screen-close').addEventListener('click', () => viewer.close());
viewer.addEventListener('click', event => { if (event.target === viewer) {
  const bounds = viewer.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) viewer.close();
}});
viewer.addEventListener('close', () => {
  document.body.classList.remove('viewer-open');
  picture.removeAttribute('src');
  opener?.focus();
});
