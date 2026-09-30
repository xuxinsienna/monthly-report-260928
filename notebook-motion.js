// One physical coordinate system for the cover, paper, holes, rings and tabs.
// Opening = the same landscape book viewed at -90 degrees; work = 0 degrees.
// Only this parent rotates/scales. No per-surface FLIP transforms are used.
function buildNotebook(n,markup){
 const template=document.createElement('template');template.innerHTML=markup;
 const frame=document.createElement('div');frame.className='notebook-viewport';
 let book=template.content.firstElementChild;
 if(n===1){
  const title=book.querySelector('.title-leaf'),toc=book.querySelector('.toc');
  book=document.createElement('article');book.className='binder physical-book opening-book chapter-0';
  book.innerHTML=tabs(0)+'<section class="sheet sheet-upper opening-paper">'+holes('bottom')+'</section>'+rings+'<section class="sheet sheet-lower opening-paper">'+holes('top')+'</section>';
  title.classList.add('opening-copy');toc.classList.add('opening-copy');
  book.querySelector('.sheet-upper').prepend(title);book.querySelector('.sheet-lower').append(toc);
  book.querySelector('.tabs').inert=true;
 }else{
  book.classList.add('physical-book');
  if(book.classList.contains('chapter-divider')){
   const lower=document.createElement('section');lower.className='sheet sheet-lower unused-leaf';lower.setAttribute('aria-hidden','true');book.append(lower);
  }
 }
 addBacking(book);frame.append(book);return frame;
}
function sizeNotebook(opening=false){
 const frame=app.firstElementChild,book=frame.querySelector('.physical-book');if(!book)return;
 const leafWidth=book.clientWidth-parseFloat(getComputedStyle(book).paddingLeft)*2;
 book.style.setProperty('--leaf-height',Math.max(570,Math.round(leafWidth*.56))+'px');
 const upper=book.querySelector('.sheet-upper');
 if(opening){
  book.querySelectorAll('.opening-copy').forEach(copy=>{
   const sheet=copy.parentElement;copy.style.width=sheet.offsetHeight+'px';copy.style.height=sheet.offsetWidth+'px';
  });
  const width=book.offsetWidth,height=book.offsetHeight;
  const fitWidth=frame.clientWidth/(height+28);
  const fitHeight=Math.max(590,innerHeight-135)/(width+24);
  const scale=Math.min(fitWidth,fitHeight);
  const x=(frame.clientWidth-(height+28)*scale)/2+14*scale;
  const y=(width+12)*scale;
  book.style.transform=`translate(${x}px,${y}px) rotate(-90deg) scale(${scale})`;
  frame.style.height=(width+24)*scale+'px';frame.classList.add('opening-viewport');
 }else{
  book.style.transform='none';
  if(book.classList.contains('chapter-divider')){
   frame.classList.add('divider-viewport');
   frame.style.height=upper.offsetTop+upper.offsetHeight+84+'px';
  }else frame.style.height=book.offsetHeight+16+'px';
 }
}
async function rotateNotebookTo(n){
 const frame=app.firstElementChild,book=frame.querySelector('.physical-book');
 const upper=book.querySelector('.sheet-upper'),lower=book.querySelector('.sheet-lower');
 const tabBar=book.querySelector('.tabs');
 const initialTransform=book.style.transform,initialHeight=frame.offsetHeight;
 const template=document.createElement('template');template.innerHTML=screenMarkup(n);
 const destination=template.content.firstElementChild,sourceSheet=destination.querySelector('.sheet-upper');
 const oldCopies=Array.from(book.querySelectorAll('.opening-copy'));
 const nextCopy=document.createElement('div');nextCopy.className='chapter-copy';
 for(const child of Array.from(sourceSheet.children))if(!child.classList.contains('punches'))nextCopy.append(child);
 upper.append(nextCopy);
 // Keep every physical surface and its dimensions fixed throughout the turn.
 book.className=destination.className+' physical-book shared-turn';
 upper.className=sourceSheet.className;
 Array.from(tabBar.children).forEach((tab,i)=>{
  const selected=i===CHAPTER_PAGES.indexOf(n);tab.classList.toggle('active',selected);tab.setAttribute('aria-current',selected?'page':'false');
 });
 tabBar.inert=true;
 const targetHeight=upper.offsetTop+upper.offsetHeight+84;
 const animations=[];
 const run=(el,frames,options)=>{const a=el.animate(frames,{fill:'both',...options});animations.push(a);return a;};
 const timing={duration:1200,easing:'cubic-bezier(.65,.01,.32,1)'};
 run(book,[{transform:initialTransform},{transform:'translate(0px,0px) rotate(0deg) scale(1)'}],timing);
 run(frame,[{height:initialHeight+'px'},{height:targetHeight+'px'}],timing);
 oldCopies.forEach(copy=>run(copy,[{opacity:1},{opacity:0}],{duration:340,easing:'ease-out'}));
 run(nextCopy,[{opacity:0},{opacity:1}],{delay:880,duration:480,easing:'ease-out'});
 // Like the reference Work section, tabs wait for the rotation then slide out.
 Array.from(tabBar.children).forEach((tab,i)=>run(tab,[{transform:'translateY(82px)',opacity:0},{transform:'translateY(0)',opacity:1}],{delay:870+i*80,duration:480,easing:'cubic-bezier(.44,0,0,.98)'}));
 // Crop only the empty lower half of the camera view, without moving its paper/rings.
 frame.classList.remove('opening-viewport');frame.classList.add('turning-viewport');
 run(frame,[{clipPath:'inset(-100vh -100vw -150vh -100vw)'},{clipPath:'inset(-24px -24px 0px -24px)'}],{delay:950,duration:380,easing:'ease-out'});
 page=n;history.replaceState(null,'','#'+n);document.querySelector('#position').textContent=`${String(page).padStart(2,'0')} / ${String(TOTAL_PAGES).padStart(2,'0')}`;
 try{await Promise.all(animations.map(a=>a.finished));}finally{
  book.style.transform='none';frame.style.height=targetHeight+'px';
  oldCopies.forEach(copy=>copy.remove());upper.append(...nextCopy.children);nextCopy.remove();
  lower.classList.add('unused-leaf');lower.setAttribute('aria-hidden','true');
  book.classList.remove('shared-turn');frame.classList.remove('turning-viewport');frame.classList.add('divider-viewport');
  animations.forEach(a=>a.cancel());tabBar.inert=false;
 }
}
window.addEventListener('resize',()=>{if(typeof busy!=='undefined'&&!busy)sizeNotebook(page===1)});
