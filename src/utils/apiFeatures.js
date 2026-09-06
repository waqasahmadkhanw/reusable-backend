class ApiFeatures {
  constructor(query, queryString) { this.query=query; this.queryString=queryString||{}; }
  search(searchFields=[]) {
    const keyword=String(this.queryString.keyword||"").trim().slice(0,100);
    if(keyword&&searchFields.length){const escaped=keyword.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");this.query=this.query.find({$or:searchFields.map(field=>({[field]:{$regex:escaped,$options:"i"}}))});}
    return this;
  }
  filter(allowedFields=[]) {
    const out={};
    for(const field of allowedFields){
      const value=this.queryString[field];
      // Only primitives allowed — blocks operator-injection payloads like
      // ?status[$ne]=null, which qs would otherwise parse into an object.
      if(value!==undefined && (typeof value==="string"||typeof value==="number"||typeof value==="boolean")) out[field]=value;
    }
    this.query=this.query.find(out); return this;
  }
  sort(allowedFields=["createdAt","updatedAt"]) {
    const raw=String(this.queryString.sort||"").trim();
    if(!raw){this.query=this.query.sort("-createdAt");return this;}
    const fields=raw.split(",").map(v=>v.trim()).filter(Boolean);
    const valid=fields.filter(token=>{const field=token.replace(/^-/,"");return allowedFields.includes(field);});
    if(!valid.length) return this;
    this.query=this.query.sort(valid.map(v=>v.startsWith("-")?v:`${v}`).join(" ")); return this;
  }
  paginate() {const page=Math.max(Number.parseInt(this.queryString.page,10)||1,1);const limit=Math.min(Math.max(Number.parseInt(this.queryString.limit,10)||10,1),100);this.query=this.query.skip((page-1)*limit).limit(limit);return this;}
  selectFields(allowedFields=[]) {
    if(!this.queryString.fields)return this;
    const requested=String(this.queryString.fields).split(",").map(v=>v.trim()).filter(Boolean);
    const valid=requested.filter(v=>allowedFields.includes(v));
    if(valid.length)this.query=this.query.select(valid.join(" "));
    return this;
  }
}
export default ApiFeatures;
