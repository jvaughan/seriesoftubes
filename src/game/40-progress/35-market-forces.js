/* ---------- Market Forces (docs/proposals/realistic-market.md) ----------
   A Normal-game option that prices customers more like the real market: wholesale transit costs more per Gbps than a
   plain terrestrial circuit, and a circuit earns its premium from being hard to deliver (diverse, no sharks, two data
   centers), not from being a circuit. Every factor is here; the price sites ask these helpers, so Classic stays exact. */
// rate: transit-type list prices; l2: the km-priced circuit formula; req: requirement bonuses on circuits.
const MF={rate:{isp:3,provedor:2.5,metav:1.5,cgame:1.3},l2:0.3,req:2};
const mfOn=()=>modeOn('forces');
// What a transit-type customer pays per Gbps before the market moves it.
const bizRate=t=>{const T=BIZ_T[t],f=mfOn()&&MF.rate[t];return f?Math.round(T.rate*f):T.rate;};
// A circuit's price per Gbps from its length. Latency-priced circuits keep their price: low latency really is a premium.
const l2Per=(km,T,f=T.km)=>(150+km*0.08)*f*(mfOn()&&!T.lat?MF.l2:1);
// A requirement's bonus. On a circuit, being hard to deliver pays double; latency-priced circuits keep Classic bonuses.
const reqBonus=(k,T)=>REQS[k].bonus*(mfOn()&&T&&T.l2&&!T.lat?MF.req:1);
