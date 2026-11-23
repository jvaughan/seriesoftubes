/* ---------- Market Forces (docs/proposals/realistic-market.md) ----------
   A Normal-game option that prices customers more like the real market: wholesale transit costs more per Gbps than a
   plain terrestrial circuit, and a circuit earns its premium from being hard to deliver (diverse, no sharks, two data
   centers), not from being a circuit. Every factor is here; the price sites ask these helpers, so Classic stays exact. */
// demand: how often a wholesale buyer turns up, from the networks present in a city (see mfDemand()).
// rate: transit-type list prices; l2: the km-priced circuit formula; req: requirement bonuses on circuits;
// buy: the transit you buy, flat for its first days, then cheaper by yr a year down to floor of its list price.
const MF={rate:{isp:3,provedor:2.5,metav:1.5,cgame:1.3},l2:0.3,req:2,buy:{free:180,yr:0.08,floor:0.4},demand:{ref:1000,min:0.1}};
const mfOn=()=>modeOn('forces');
// Wholesale transit buyers (the MF.rate types) pay what transit costs where they are: in the mode their price follows
// the city's transit price (regionMult(): 2.5× in Asia, 3× in Australia), as what you buy there does.
const mfReg=t=>mfOn()&&!!MF.rate[t];
// What a transit-type customer pays per Gbps before the market moves it; with a city, the mode's regional price too.
const bizRate=(t,c)=>{const T=BIZ_T[t],f=mfOn()&&MF.rate[t],r=f?Math.round(T.rate*f):T.rate;return c&&mfReg(t)?Math.round(r*regionMult(c)):r;};
// The same with Australia's dearer retail prices (AU_ARPU), which the regional price replaces for wholesale buyers.
const cityRate=(t,c)=>CITY[c].au&&!mfReg(t)?bizRate(t)*AU_ARPU:bizRate(t,c);
// A circuit's price per Gbps from its length. Latency-priced circuits keep their price: low latency really is a premium.
const l2Per=(km,T,f=T.km)=>(150+km*0.08)*f*(mfOn()&&!T.lat?MF.l2:1);
// A requirement's bonus. On a circuit, being hard to deliver pays double; latency-priced circuits keep Classic bonuses.
const reqBonus=(k,T)=>REQS[k].bonus*(mfOn()&&T&&T.l2&&!T.lat?MF.req:1);
/* What bought transit costs against its list price. Upstreams cut prices too, a little slower than you can (the customer
   market falls about 10% a year to 30%), so what you sell never sinks below what you pay for it. Without the market
   rule it stays at 1, like the customer market. */
const mfBuy=(d=S&&S.day)=>{const B=MF.buy;return mfOn()&&rule('market')&&d>B.free?Math.max(B.floor,Math.pow(1-B.yr,(d-B.free)/365)):1;};
/* A thin market is dear because few networks are there to buy or sell (txComp() prices it from the same PeeringDB
   presences), so wholesale buyers turn up there as seldom as it is dear: every one in a hub with a thousand networks
   present, a third as often with a hundred, one in ten where PeeringDB knows nobody. A city it does not know keeps
   the plain regional price and every buyer. */
const mfDemand=c=>{const q=CITY_PDB[c],D=MF.demand;return q?clamp(Math.sqrt(q[1]/D.ref),D.min,1):1;};
// Whether a wholesale buyer for this city shows up today. Only in the mode, so Classic's random stream is untouched.
const mfBuyer=(t,c)=>!mfReg(t)||!c||mfDemand(c)>=1||Math.random()<mfDemand(c);
