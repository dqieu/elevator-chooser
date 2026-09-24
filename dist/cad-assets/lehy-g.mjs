// Manufacturer TABLE 102 and hoistway dimension chains; original DWGs remain local.
export const lehyGProfiles = [
  {
    "capacity": 2000,
    "file": "LEHY-G(NS3G1)-01-1.dwg",
    "throughFile": "LEHY-G(NS3G1)-02-1.dwg",
    "throughSha256": "bc8cf7e283c32ca0c001cf5810f574156bb604305eb7c3361bd101da20955a76",
    "sha256": "163d5cab3ab4ed7ae5507425d4fb4c99d84970ebcd6a2dcb67166016bdf828cd",
    "width": [
      1500,
      2000
    ],
    "depth": [
      2000,
      3000
    ],
    "gaugeExtra": 80,
    "cd": 60
  },
  {
    "capacity": 3000,
    "file": "LEHY-G(NS3G1)-11-1.dwg",
    "throughFile": "LEHY-G(NS3G1)-12-1.dwg",
    "throughSha256": "47e7101250b38ec0bac7b0b9c2662b63ac2e0eb0f582c4ec41a3f7bbfdba4014",
    "sha256": "ec63b2a45e9190232595914fe4af78ce0d02a3668e95175ad5397cc4ea65d3b7",
    "width": [
      1800,
      2800
    ],
    "depth": [
      2140,
      3200
    ],
    "gaugeExtra": 80,
    "cd": 60
  },
  {
    "capacity": 5000,
    "file": "LEHY-G(NS3G1)-21-1.dwg",
    "throughFile": "LEHY-G(NS3G1)-22-1.dwg",
    "throughSha256": "3560c60a9ff68f3a07615e433193d829a8b0a3e244ff9b4731b5d035cd7ce593",
    "sha256": "4efa4ec44b5826bb9761c1080f30a370dda5af9e9a34b7b383c08de0583bb880",
    "width": [
      2000,
      2800
    ],
    "depth": [
      2800,
      3600
    ],
    "gaugeExtra": 80,
    "cd": 60
  },
  {
    "capacity": 10000,
    "file": "LEHY-G(NS3G1)-31-1.dwg",
    "throughFile": "LEHY-G(NS3G1)-32-1.dwg",
    "throughSha256": "5fc33517c56100dd6f604d0000277dd91aec84934a9c5de06327f9284ff9b0f1",
    "sha256": "3d1f5f5327582471859022a25d3e2358398f9bd98f57b2da465425fae68cc9af",
    "width": [
      2500,
      3500
    ],
    "depth": [
      4000,
      6200
    ],
    "gaugeExtra": 200,
    "cd": 220
  }
];
export function lehyGGeometry(model,i,v){
 if(model!=='LEHY-G'||!['1D1G','1D/2D-2G'].includes(i.ENTR)||i.DRKI!=='2CO'||!['LB','RB'].includes(i.POCW))return null;
 const through=i.ENTR==='1D/2D-2G';
 const p=lehyGProfiles.find(p=>p.capacity===i.CAP);
 if(!p||i.AA<p.width[0]||i.AA>p.width[1]||i.BB<p.depth[0]||i.BB>p.depth[1]||![0.5,1].includes(i.SPD)||(i.CAP===10000&&i.SPD!==0.5))return null;
 // Reject workbook/template envelope disagreement rather than silently transplant rules.
 if(v.A_S!==i.AA+(i.CAP===2000?80:100)||v.BS!==i.BB+(through?398:i.CAP===10000?249:229)||v.B_3!==180||v.KAKK!==80||v.DKWC!==119)return null;
 return {...p,...through?{file:p.throughFile,sha256:p.throughSha256}:{},BG:v.A_S+p.gaugeExtra,EE:v.BS/2,CD:p.cd};
}
