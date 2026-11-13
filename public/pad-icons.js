// Shared, original line icons for the 3D and illustrated farm views.
// x/y is the centre; size is the full width of a 24-unit icon.
export const PAD_NAMES={basket:'Basket',boots:'Boots',coop:'Coop',mill:'Mill',dairy:'Dairy',milk:'Milk',orchard:'Orchard',farmhand:'Bea',runner:'Pip',helper:'Helper',farm:'Farm',farmupgrade:'Farm',expand:'Expand',parcel:'Land',barn:'Storage',storage:'Storage',workshop:'Workshop',grain:'Grain',cheese:'Cheese',butter:'Butter',bread:'Bread',juice:'Juice'};
export function drawFarmIcon(ctx,id,x,y,size,color='#fff8db'){
  const c=ctx;c.save();c.translate(x-size/2,y-size/2);c.scale(size/24,size/24);
  c.strokeStyle=color;c.fillStyle=color;c.lineWidth=1.9;c.lineCap='round';c.lineJoin='round';
  const path=(points,close=false)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));if(close)c.closePath();c.stroke();};
  const circle=(cx,cy,r)=>{c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.stroke();};
  const rect=(a,b,w,h,r=0)=>{c.beginPath();if(r&&c.roundRect)c.roundRect(a,b,w,h,r);else c.rect(a,b,w,h);c.stroke();};
  if(id==='basket'){
    path([[4,10],[6,20],[18,20],[20,10]],true);path([[3,10],[21,10]]);path([[8,10],[10,4],[14,4],[16,10]]);path([[9,13],[10,17]]);path([[15,13],[14,17]]);
  }else if(id==='boots'){
    path([[5,3],[13,3],[13,13],[19,15],[21,18],[21,21],[5,21]],true);path([[5,17],[12,17],[14,19],[21,19]]);path([[9,7],[13,7]]);path([[9,10],[13,10]]);
  }else if(id==='coop'){
    path([[3,10],[12,3],[21,10]]);path([[5,9],[5,21],[19,21],[19,9]]);rect(9,14,6,7,1);path([[10,8],[14,8]]);path([[12,6],[12,10]]);
  }else if(id==='mill'){
    path([[8,21],[10,10],[14,10],[16,21]],true);circle(12,9,1.4);path([[11,8],[4,5],[5,2],[12,7]]);path([[13,8],[17,2],[20,4],[14,9]]);path([[13,10],[20,13],[19,16],[12,11]]);path([[11,10],[7,16],[4,14],[10,9]]);
  }else if(id==='orchard'||id==='apple'){
    c.beginPath();c.moveTo(12,8);c.bezierCurveTo(5,2,2,10,5,16);c.bezierCurveTo(7,21,9,22,12,20);c.bezierCurveTo(15,22,18,20,20,14);c.bezierCurveTo(22,7,17,3,12,8);c.stroke();path([[12,8],[13,4],[16,2]]);path([[14,4],[19,3]]);
  }else if(id==='dairy'){
    path([[3,10],[12,3],[21,10]]);path([[5,9],[5,21],[19,21],[19,9]]);rect(9,13,6,8,1);path([[10,13],[10,10],[14,10],[14,13]]);path([[9,17],[15,17]]);
  }else if(id==='milk'){
    rect(8,2,8,3,1);path([[9,5],[9,8],[6,11],[6,21],[18,21],[18,11],[15,8],[15,5]]);path([[6,13],[18,13]]);path([[6,18],[18,18]]);c.beginPath();c.moveTo(12,14);c.quadraticCurveTo(8.7,17,12,17.7);c.quadraticCurveTo(15.3,17,12,14);c.stroke();
  }else if(id==='farm'||id==='farmupgrade'){
    path([[3,10],[12,3],[21,10]]);path([[5,9],[5,21],[19,21],[19,9]]);rect(9,14,6,7);path([[12,6],[12,10]]);path([[10,8],[14,8]]);if(id==='farmupgrade'){path([[2,16],[2,12],[6,12]]);path([[18,12],[22,12],[22,16]]);}
  }else if(id==='expand'||id==='parcel'){
    path([[8,3],[3,3],[3,8]]);path([[16,3],[21,3],[21,8]]);path([[3,16],[3,21],[8,21]]);path([[21,16],[21,21],[16,21]]);path([[8,8],[3,3]]);path([[16,8],[21,3]]);path([[8,16],[3,21]]);path([[16,16],[21,21]]);
  }else if(id==='farmhand'||id==='runner'||id==='helper'){
    circle(12,8,3.5);path([[4,7],[20,7]]);path([[8,5],[9,2],[15,2],[16,5]]);c.beginPath();c.moveTo(5,21);c.bezierCurveTo(5,12,19,12,19,21);c.stroke();path([[9,15],[9,21]]);path([[15,15],[15,21]]);if(id==='runner')path([[2,13],[5,13]]);
  }else if(id==='coin'){
    circle(12,12,9);circle(12,12,6.2);path([[10,9],[12,7],[12,17]]);path([[10,17],[14,17]]);
  }else if(id==='sell'){
    path([[4,10],[4,21],[20,21],[20,10]]);path([[3,10],[5,3],[19,3],[21,10]],true);path([[8,4],[7,10]]);path([[13,4],[13,10]]);path([[17,4],[19,10]]);rect(8,15,8,6);
  }else if(id==='wheat'||id==='grain'){
    path([[12,22],[12,3]]);for(const v of [7,12,17]){path([[12,v],[7,v-1],[5,v-5],[10,v-4],[12,v]]);path([[12,v+3],[17,v+2],[19,v-2],[14,v-1],[12,v+3]]);}
  }else if(id==='egg'){
    c.beginPath();c.moveTo(12,3);c.bezierCurveTo(18,3,23,21,12,21);c.bezierCurveTo(1,21,6,3,12,3);c.stroke();c.beginPath();c.moveTo(7,14);c.quadraticCurveTo(7,18,10,18);c.stroke();
  }else if(id==='flour'){
    path([[7,7],[5,3],[19,3],[17,7],[20,21],[4,21],[7,7]],true);path([[7,7],[17,7]]);path([[12,11],[12,18]]);path([[12,14],[9,12]]);path([[12,16],[15,14]]);
  }else if(id==='cheese'){
    path([[3,12],[17,4],[21,10],[21,20],[3,20],[3,12],[21,10]]);circle(8,16,1.2);circle(16,15,1.5);circle(14,9,.9);
  }else if(id==='butter'){
    rect(3,10,18,10,2);path([[3,12],[10,7],[21,10]]);path([[10,7],[10,16],[3,20]]);path([[14,14],[18,13]]);
  }else if(id==='bread'){
    c.beginPath();c.moveTo(4,20);c.lineTo(3,13);c.bezierCurveTo(0,5,23,1,21,13);c.lineTo(20,20);c.closePath();c.stroke();path([[7,10],[10,7]]);path([[12,11],[15,7]]);path([[17,11],[19,8]]);path([[5,17],[19,17]]);
  }else if(id==='juice'){
    path([[7,5],[7,2],[17,2],[17,5],[20,9],[20,21],[4,21],[4,9],[7,5]],true);path([[4,11],[20,11]]);circle(12,16,3);path([[12,13],[13,11]]);
  }else if(id==='barn'||id==='storage'||id==='box-in'||id==='box-out'){
    path([[3,8],[12,3],[21,8],[21,20],[3,20],[3,8],[12,13],[21,8]]);path([[12,13],[12,20]]);
    if(id==='box-in'||id==='box-out'){const a=id==='box-in'?0:1;c.save();c.translate(0,a?0:0);path(a?[[8,16],[8,6],[5,9],[8,6],[11,9]]:[[8,5],[8,15],[5,12],[8,15],[11,12]]);c.restore();}
  }else if(id==='workshop'){
    path([[3,21],[3,10],[9,6],[9,11],[16,7],[16,21]],true);path([[16,12],[21,12],[21,21],[16,21]]);path([[18,12],[18,3],[21,3],[21,12]]);rect(6,15,3,3);rect(12,15,2,3);
  }else if(id==='feed'){
    path([[3,12],[5,20],[19,20],[21,12]],true);path([[3,12],[21,12]]);path([[12,11],[12,3]]);path([[12,7],[8,4]]);path([[12,9],[16,6]]);
  }else if(id==='working'){
    circle(12,12,7);circle(12,12,2.6);for(let i=0;i<8;i++){const a=i*Math.PI/4;path([[12+Math.cos(a)*7,12+Math.sin(a)*7],[12+Math.cos(a)*10,12+Math.sin(a)*10]]);}
  }else if(id==='ready'){
    circle(12,12,9);path([[6,12],[10,16],[18,8]]);
  }else if(id==='blocked'){
    path([[12,3],[22,21],[2,21],[12,3]],true);path([[12,9],[12,14]]);circle(12,18,.5);
  }else if(id==='lock'){
    rect(5,10,14,11,2);c.beginPath();c.moveTo(8,10);c.lineTo(8,7);c.bezierCurveTo(8,1,16,1,16,7);c.lineTo(16,10);c.stroke();circle(12,15,1);path([[12,16],[12,18]]);
  }else{
    path([[12,4],[12,20]]);path([[4,12],[20,12]]);
  }
  c.restore();
}
