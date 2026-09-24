// Project search constraints stay distinct from calculated minimum dimensions.
export function sectionDefaults(request={},preferences={}){
 const travel=Number(request.travel??30)*1000;
 const stops=Number(preferences.stops??5);
 const floorHeights=String(preferences.floorHeights??'').trim();
 const heights=floorHeights?floorHeights.split(/[\s,;]+/).map(Number):Array(stops-1).fill(Number(preferences.floorHeight??3300));
 const matches=heights.length===stops-1&&heights.every(n=>Number.isFinite(n)&&n>0)&&Math.abs(heights.reduce((a,b)=>a+b,0)-travel)<0.001;
 return {wallThickness:200,openingAllowance:200,...preferences,stops,floorHeight:travel/(stops-1),floorHeights:matches?floorHeights:''};
}
export function siteErrors(result,request={}){
 const names={width:['AH','Rộng giếng'],depth:['BH','Sâu giếng'],overhead:['OH','OH'],pit:['PD','Pit']};
 return Object.entries(names).filter(([key,[output]])=>request[key]!=null&&result.outputs[output]+(request.margin??0)>request[key]).map(([key,[output,label]])=>`${label} cần ${result.outputs[output]+(request.margin??0)} mm, vượt ${request[key]} mm đã nhập.`);
}
