import * as THREE from './three.module.js';

let stopCurrent=()=>{};
const view={angle:.55,elevation:.85,distance:23};
export function mountOffice3D(onSelect, isMoving, selected='central', motionStart=0){
  stopCurrent();
  const container=document.getElementById('office-3d');
  if(!container)return;
  let renderer;
  try { renderer=new THREE.WebGLRenderer({antialias:true,alpha:true}); } catch {container.textContent='No se pudo iniciar la vista 3D en este navegador.';return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.15;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e7eceb');
  const camera=new THREE.PerspectiveCamera(38,1,.1,100);
  const target=new THREE.Vector3(0,.2,0);let {angle,elevation,distance}=view;
  const cameraUpdate=()=>{Object.assign(view,{angle,elevation,distance});camera.position.set(target.x+distance*Math.sin(angle)*Math.cos(elevation),target.y+distance*Math.sin(elevation),target.z+distance*Math.cos(angle)*Math.cos(elevation));camera.lookAt(target)};
  cameraUpdate();
  scene.add(new THREE.HemisphereLight(0xffffff,0x809991,2.2));
  const sun=new THREE.DirectionalLight(0xffffff,2.4);sun.position.set(-5,12,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-9;sun.shadow.camera.right=9;sun.shadow.camera.top=9;sun.shadow.camera.bottom=-9;scene.add(sun);
  const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.8});
  const materials={floor:mat('#dec6a2'),wall:mat('#ecf0e9'),edge:mat('#9aabaa'),wood:mat('#bb8758'),dark:mat('#34535b'),green:mat('#79b486'),leaf:mat('#5a9d64'),blue:mat('#5f8697'),yellow:mat('#e4b341'),orange:mat('#c57546'),skin:mat('#dba879'),hair:mat('#3d3028'),screen:mat('#294857'),pot:mat('#a57d59')};
  const selectable=[];
  const cream=mat('#f8f2e5'),brass=mat('#d3a958'),navy=mat('#244b53'),paper=mat('#f3e8d7');
  function box(w,h,d,x,y,z,material,parent=scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
  function label(text,x,y,z){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(255,255,255,.94)';ctx.roundRect(2,2,508,92,45);ctx.fill();ctx.fillStyle='#245448';ctx.font='bold 42px system-ui';ctx.textAlign='center';ctx.fillText(text,256,63);const texture=new THREE.CanvasTexture(canvas);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));sprite.scale.set(2.05,.39,1);sprite.position.set(x,y,z);scene.add(sprite);return sprite}
  box(12,.3,9,0,-.16,0,materials.floor);box(12,1.8,.16,0,.9,-4.5,materials.wall);box(.16,1.8,9,-6,.9,0,materials.wall);
  box(12.2,.15,9.2,0,-.38,0,navy);
  box(12,.12,.12,0,.08,-4.35,materials.wood);
  box(.12,.12,8.8,-5.85,.08,0,materials.wood);
  for(const x of [-2,2]){box(.12,1.4,3.15,x,.7,-2.9,materials.wall)}
  for(let x=-5.5;x<6;x+=.8)box(.012,.008,9,x,.005,0,materials.wood);
  function desk(x,z){box(2.15,.16,.9,x,.95,z,materials.wood);for(const dx of [-.9,.9])for(const dz of [-.32,.32])box(.09,.85,.09,x+dx,.48,z+dz,materials.dark);box(.8,.5,.09,x,1.32,z-.15,materials.screen);box(.55,.04,.25,x,1.05,z+.2,materials.wall);box(.5,.1,.5,x, .52,z+1.1,materials.blue)}
  desk(-4,-3.05);desk(0,-3.05);desk(4,-3.05);
  for(const x of [-4,0,4]){
    box(.65,.55,.12,x,.83,-1.75,materials.blue);
    box(.12,.45,.12,x,.25,-1.95,materials.dark);
    box(.65,.08,.65,x,.08,-1.95,materials.dark);
    box(.46,.035,.3,x-.67,1.06,-2.94,paper);
    box(.16,.2,.16,x+.75,1.15,-2.8,cream);
    box(.025,.32,.025,x-.8,1.2,-3.36,brass);
    box(.3,.06,.2,x-.8,1.36,-3.36,brass);
    box(.68,.32,.015,x,1.34,-3.14,mat('#7db6bc'));
    for(let j=0;j<3;j++)box(.1,.06+j*.04,.02,x-.2+j*.2,1.28,-3.12,cream);
    // Recessed wall boards and a thin room accent.
    box(1.8,.58,.05,x,1.32,-4.37,navy);
    box(1.55,.028,.025,x,1.45,-4.33,brass);
    box(1.1,.025,.025,x-.2,1.23,-4.33,cream);
  }
  // Low storage cabinets with colored folders.
  for(const x of [-5.25,1.15,5.15]){box(.75,.7,.45,x,.35,-3.9,materials.wood);box(.8,.07,.5,x,.75,-3.9,cream);for(let j=0;j<4;j++)box(.11,.34,.25,x-.24+j*.16,.95,-3.9,j%2?navy:brass)}
  box(3.1,.03,2.25,0,.02,2,materials.green);box(1.2,.14,.9,0,.62,2,materials.wood);for(const x of [-.5,.5])for(const z of [1.65,2.35])box(.08,.58,.08,x,.3,z,materials.dark);
  box(1.7,.45,.65,-4,.35,2.3,materials.blue);box(1.7,.55,.18,-4,.8,2.05,materials.blue);
  box(.15,.55,.75,-4.85,.52,2.3,materials.blue);box(.15,.55,.75,-3.15,.52,2.3,materials.blue);
  box(.48,.1,.5,-4.4,.64,2.32,cream);box(.48,.1,.5,-3.75,.64,2.32,materials.green);
  box(1.2,.12,.65,-4,.44,3.35,materials.wood);box(.65,.035,.34,-4,.52,3.35,paper);
  for(const x of [-1.1,1.1]){box(.5,.12,.6,x,.48,2,materials.blue);box(.12,.5,.6,x+(x<0?-.22:.22),.75,2,materials.blue)}
  box(.4,.025,.3,.1,.71,2,paper);
  // Welcome desk and branded wall in the open reception area.
  box(2.1,.95,.65,3.7,.48,3.2,navy);box(2.3,.1,.8,3.7,1,3.2,materials.wood);
  label('ESQUIÚ',3.7,1.55,3.2);
  function plant(x,z){box(.35,.45,.35,x,.23,z,materials.pot);const foliage=new THREE.Mesh(new THREE.IcosahedronGeometry(.55,1),materials.leaf);foliage.position.set(x,1,z);foliage.castShadow=true;scene.add(foliage)}plant(-2.5,1.5);plant(4.9,2.8);
  function person(id,x,z,clothes){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);const torso=box(.48,.65,.3,0,1.05,0,clothes,g);const head=box(.4,.4,.36,0,1.6,0,materials.skin,g);box(.43,.13,.39,0,1.85,0,materials.hair,g);const left=box(.18,.55,.22,-.13,.47,0,materials.dark,g),right=box(.18,.55,.22,.13,.47,0,materials.dark,g);box(.14,.6,.15,-.32,1.04,0,materials.skin,g);box(.14,.6,.15,.32,1.04,0,materials.skin,g);g.traverse(o=>{if(o.isMesh){o.userData.agent=id;selectable.push(o)}});return {g,left,right,torso,head,start:new THREE.Vector3(x,0,z)}}
  const central=person('central',-4,-1.4,materials.blue),inventory=person('inventory',0,-1.4,materials.yellow),purchases=person('purchases',4,-1.4,materials.orange);
  for(const agent of [central,inventory,purchases]){
    box(.09,.075,.025,-.095,1.63,.19,materials.dark,agent.g);box(.09,.075,.025,.095,1.63,.19,materials.dark,agent.g);
    box(.14,.2,.02,.1,1.12,.17,cream,agent.g);
    box(.2,.12,.32,-.13,.16,.05,materials.hair,agent.g);box(.2,.12,.32,.13,.16,.05,materials.hair,agent.g);
  }
  const active={central,inventory,purchases}[selected]||central;
  const ring=new THREE.Mesh(new THREE.RingGeometry(.48,.56,40),new THREE.MeshBasicMaterial({color:0xc49638,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(active.g.position.x,.04,active.g.position.z);scene.add(ring);
  const names=[label('Central',-4,2.35,-1.4),label('Inventario',0,2.35,-1.4),label('Compras',4,2.35,-1.4)];
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
  function onDown(e){down={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};renderer.domElement.setPointerCapture(e.pointerId)}
  function onMove(e){if(!down)return;const dx=e.clientX-down.lastX,dy=e.clientY-down.lastY;down.lastX=e.clientX;down.lastY=e.clientY;if(Math.abs(e.clientX-down.x)+Math.abs(e.clientY-down.y)>5)down.moved=true;angle-=dx*.008;elevation=Math.max(.25,Math.min(1.35,elevation+dy*.008));cameraUpdate()}
  function onUp(e){if(!down)return;if(!down.moved){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(selectable)[0];if(hit)onSelect(hit.object.userData.agent)}down=null}
  function onWheel(e){e.preventDefault();distance=Math.max(9,Math.min(26,distance+e.deltaY*.012));cameraUpdate()}
  function onCameraControl(e){const action=e.target.closest('[data-camera]')?.dataset.camera;if(!action)return;if(action==='reset'){angle=.55;elevation=.85;distance=23}else distance=Math.max(9,Math.min(30,distance+(action==='in'?-2:2)));cameraUpdate()}
  document.addEventListener('click',onCameraControl);
  const canvas=renderer.domElement;canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('wheel',onWheel,{passive:false});
  const resize=()=>{const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)};const observer=new ResizeObserver(resize);observer.observe(container);resize();
  const route=[new THREE.Vector3(0,0,-1.4),new THREE.Vector3(0,0,-.4),new THREE.Vector3(3.25,0,-.4),new THREE.Vector3(3.25,0,-1.15)];
  let frame,started=motionStart||performance.now();function draw(now){if(!container.isConnected){stopCurrent();return}const t=(now-started)/1000;if(isMoving){const progress=Math.min(t/5,1);const p=progress<.4?progress/.4:progress<.6?1:(1-progress)/.4;const scaled=Math.max(0,Math.min(p,1))*3,index=Math.min(2,Math.floor(scaled));inventory.g.position.lerpVectors(route[index],route[index+1],scaled-index);const walking=progress<.4||progress>.6;inventory.g.rotation.y=walking?(progress<.4?Math.PI/2:-Math.PI/2):Math.PI/2;inventory.left.rotation.x=walking?Math.sin(t*12)*.4:0;inventory.right.rotation.x=-inventory.left.rotation.x;names[1].position.set(inventory.g.position.x,2.35,inventory.g.position.z)}ring.position.set(active.g.position.x,.04,active.g.position.z);renderer.render(scene,camera);frame=requestAnimationFrame(draw)}frame=requestAnimationFrame(draw);
  stopCurrent=()=>{cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('click',onCameraControl);canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointermove',onMove);canvas.removeEventListener('pointerup',onUp);canvas.removeEventListener('wheel',onWheel);scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(o.material.map)o.material.map.dispose();o.material.dispose()}});renderer.dispose();canvas.remove();stopCurrent=()=>{}};
}
