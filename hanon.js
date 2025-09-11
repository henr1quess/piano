import { Flow } from "https://unpkg.com/vexflow/releases/vexflow-esm.js";

const NOTE_TO_MIDI = {C:48,'C#':49,D:50,'D#':51,E:52,F:53,'F#':54,G:55,'G#':56,A:57,'A#':58,B:59,Bb:58,Eb:51,Ab:56};
const MAJOR_SCALE = [0,2,4,5,7,9,11];
const HANON_PATTERN = [0,1,2,3,4,3,2,1];

let rightSeq=[], leftSeq=[];
let idxR=0, idxL=0, hands='both';
let vf, score, system;
const colorsR=[], colorsL=[];

function degreeToMidi(root, degree){
  const octave = Math.floor(degree/7);
  const deg = degree % 7;
  return root + MAJOR_SCALE[deg] + 12*octave;
}

function midiToVex(m){
  const pitch = ['c','c#','d','d#','e','f','f#','g','g#','a','a#','b'][m%12];
  const oct = Math.floor(m/12)-1; // MIDI octave
  return pitch + '/' + oct;
}

function buildHanon1(name){
  const root = NOTE_TO_MIDI[name];
  const rightRoot = root + 12;
  rightSeq=[]; leftSeq=[]; idxR=0; idxL=0;
  colorsR.length=0; colorsL.length=0;
  for(let i=0;i<8;i++){
    for(const step of HANON_PATTERN){
      const deg = i+step;
      const rMidi = degreeToMidi(rightRoot, deg);
      const lMidi = degreeToMidi(root, deg);
      rightSeq.push({midi:rMidi,vex:midiToVex(rMidi)});
      leftSeq.push({midi:lMidi,vex:midiToVex(lMidi)});
      colorsR.push('#999'); colorsL.push('#999');
    }
  }
}

function render(){
  document.getElementById('notation').innerHTML='';
  vf = new Flow.Factory({renderer:{elementId:'notation',width:700,height:200}});
  score = vf.EasyScore();
  system = vf.System();
  const notesR = rightSeq.map((n,i)=>score.note(n.vex,{stem:'up',style:{fillStyle:colorsR[i]}}));
  const notesL = leftSeq.map((n,i)=>score.note(n.vex,{clef:'bass',stem:'down',style:{fillStyle:colorsL[i]}}));
  const voiceR = score.voice(notesR);
  const voiceL = score.voice(notesL);
  system.addStave({voices:[voiceR]});
  system.addStave({voices:[voiceL]});
  vf.draw();
}

function check(hand, note){
  if(hand==='right'){
    const expected = rightSeq[idxR];
    if(!expected) return;
    if(note===expected.midi){
      colorsR[idxR] = '#3ddc84';
      idxR++; render();
    }else{
      colorsR[idxR] = '#ff5a6f'; render();
    }
  } else {
    const expected = leftSeq[idxL];
    if(!expected) return;
    if(note===expected.midi){
      colorsL[idxL] = '#3ddc84';
      idxL++; render();
    }else{
      colorsL[idxL] = '#ff5a6f'; render();
    }
  }
}

function onMIDIMessage(e){
  const [status, data1, data2] = e.data;
  const type = status & 0xf0;
  if(type===0x90 && data2>0){
    if(hands==='both' || hands==='right'){
      if(data1>=60) check('right', data1);
    }
    if(hands==='both' || hands==='left'){
      if(data1<60) check('left', data1);
    }
  }
}

let midiAccess=null, inputPort=null;
async function enableMIDI(){
  if(!navigator.requestMIDIAccess){
    document.getElementById('status').textContent='Web MIDI não suportado; use Chrome/Edge em https ou localhost';
    return;
  }
  try{
    midiAccess = await navigator.requestMIDIAccess();
    document.getElementById('status').textContent='MIDI enabled';
    const first = midiAccess.inputs.values().next().value;
    if(first){
      inputPort = first;
      inputPort.onmidimessage = onMIDIMessage;
    }
  }catch(err){
    document.getElementById('status').textContent='MIDI failed';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('enable-midi').addEventListener('click', enableMIDI);
  document.getElementById('start').addEventListener('click', () => {
    const scale = document.getElementById('scale').value;
    hands = document.getElementById('hands').value;
    buildHanon1(scale);
    render();
  });
});
