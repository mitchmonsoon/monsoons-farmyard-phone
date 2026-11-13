// Original lightweight farm soundscape: no downloads or external audio services.
export class FarmSoundscape {
  constructor({enabled=true,volume=.35,ambience=true}={}) {
    this.enabled=enabled;this.volume=volume;this.ambience=ambience;this.active=true;this.lastEffect=0;this.nextBird=0;
  }
  async ensure() {
    if(!this.enabled)return;
    try {
      if(!this.context){
        const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
        this.context=new Audio();this.master=this.context.createGain();this.master.connect(this.context.destination);
        const buffer=this.context.createBuffer(1,this.context.sampleRate*2,this.context.sampleRate),samples=buffer.getChannelData(0);
        for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*.24;
        this.noise=buffer;
        const breeze=this.context.createBufferSource(),filter=this.context.createBiquadFilter();this.air=this.context.createGain();
        breeze.buffer=buffer;breeze.loop=true;filter.type='lowpass';filter.frequency.value=420;
        breeze.connect(filter);filter.connect(this.air);this.air.connect(this.master);breeze.start();this.breeze=breeze;
      }
      if(this.context.state==='suspended')await this.context.resume();this.updateVolume();
    }catch{}
  }
  updateVolume(){if(!this.context)return;const t=this.context.currentTime;this.master.gain.setTargetAtTime(this.enabled&&this.active?Math.max(0,Math.min(1,this.volume))*.32:0,t,.06);this.air.gain.setTargetAtTime(this.ambience?.12:0,t,.15);}
  setActive(active){active=Boolean(active);if(this.active===active)return;this.active=active;this.updateVolume();}
  setPreferences(p){Object.assign(this,p);this.updateVolume();if(this.enabled)this.ensure();}
  tone(frequency,duration=.13,gain=.16,{end=frequency,type='sine',delay=0}={}){
    if(!this.context||this.context.state!=='running')return;const t=this.context.currentTime+delay,o=this.context.createOscillator(),g=this.context.createGain();
    o.type=type;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0001,gain),t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.01);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  rustle(duration=.09,gain=.18,frequency=2200){
    if(!this.context)return;const t=this.context.currentTime,n=this.context.createBufferSource(),f=this.context.createBiquadFilter(),g=this.context.createGain();
    n.buffer=this.noise;f.type='bandpass';f.frequency.value=frequency;f.Q.value=.7;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    n.connect(f);f.connect(g);g.connect(this.master);n.start(t);n.stop(t+duration);n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();};
  }
  effect(e){
    if(!this.enabled||!this.active||!this.context||this.context.state!=='running')return;
    const now=performance.now();if(now-this.lastEffect<90&&!['purchase','contract','late','rush'].includes(e.type))return;
    if(!['harvest','deposit','sell','cash','purchase','withdraw','milestone','contract','late','rush'].includes(e.type))return;this.lastEffect=now;
    if(e.type==='harvest'){this.rustle(.11,.14,e.good==='wheat'||e.good==='grain'?1700:2600);this.tone(e.good==='milk'?310:460,.08,.09,{end:620});}
    else if(e.type==='deposit'||e.type==='withdraw'){this.tone(220,.09,.18,{end:130,type:'triangle'});this.tone(780,.055,.06,{delay:.018});}
    else if(e.type==='sell'||e.type==='cash'){[880,1174,1568].forEach((f,i)=>this.tone(f,.16,.12,{delay:i*.045}));}
    else if(e.type==='contract'){[440,554,659].forEach((f,i)=>this.tone(f,.17,.09,{delay:i*.085,type:'triangle'}));}
    else if(e.type==='late'){[310,244,185].forEach((f,i)=>this.tone(f,.21,.08,{delay:i*.075,type:'triangle'}));}
    else if(e.type==='rush'){[523,659,784,1047].forEach((f,i)=>this.tone(f,.18,.12,{delay:i*.055,type:'triangle'}));}
    else{[392,494,587,784].forEach((f,i)=>this.tone(f,.26,.14,{delay:i*.065,type:'triangle'}));this.rustle(.25,.12,3300);}
  }
  tick(now){
    if(!this.ambience||!this.enabled||!this.active||!this.context||this.context.state!=='running'||now<this.nextBird)return;
    this.nextBird=now+9000+Math.random()*10000;
    this.tone(1900,.13,.025,{end:2600});this.tone(2300,.1,.022,{end:1800,delay:.18});
  }
  destroy(){this.breeze?.stop();this.breeze?.disconnect();this.context?.close().catch(()=>{});this.context=null;}
}
