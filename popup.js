const card=document.querySelector('#card');const status=document.querySelector('#status');const bar=document.querySelector('#bar');const robot=document.querySelector('#robot-position');const points=[[0,6],[.22,-1],[.48,-8],[.7,-15],[.86,-21],[1,-27]];
function topAt(percent){const p=percent/100;for(let i=1;i<points.length;i++){if(p<=points[i][0]){const[a,y1]=points[i-1],[b,y2]=points[i];const n=(p-a)/(b-a),e=n*n*(3-2*n);return y1+(y2-y1)*e}}return-27}
let completionCloseTimer = null;
let inactivityTimer = null;
function showFailure(message){clearTimeout(completionCloseTimer);clearTimeout(inactivityTimer);card.classList.remove('complete');card.classList.add('failed');status.textContent=typeof message==='string'?message:"Capture couldn’t finish. Refresh this page and try again."}
function armInactivityTimer(){clearTimeout(inactivityTimer);inactivityTimer=setTimeout(()=>showFailure("No recent progress. Refresh this page and try again."),60000)}
function update(data){if(data.state==='failed'){showFailure();return}card.classList.remove('failed');armInactivityTimer();const p=Math.max(3,Math.min(100,data.progressPercent||3));status.textContent=data.status||'Capturing…';bar.style.width=`${p}%`;robot.style.left=`${p}%`;robot.style.top=`${topAt(p)}px`;robot.style.transform=`translateX(-${p}%)`;if(data.state==='complete'){clearTimeout(inactivityTimer);card.classList.add('complete');if(completionCloseTimer===null)completionCloseTimer=setTimeout(()=>window.close(),1700)}}
chrome.runtime.onMessage.addListener(message=>{if(message?.type==='popup-progress')update(message)});
armInactivityTimer();
chrome.runtime.sendMessage({type:'start-popup-capture'}).then(response=>{if(!response?.ok)showFailure()}).catch(showFailure);
