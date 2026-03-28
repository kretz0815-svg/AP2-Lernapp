let str = "2026-03-24T12:00:00Z";
let sup = new Date(str).getTime();
let loc = Date.now();
console.log(`Sup: ${sup}, Loc: ${loc}`);
