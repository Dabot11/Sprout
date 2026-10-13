export class Spatial<T extends {x:number;y:number}> {
  private buckets=new Map<string,T[]>();
  constructor(private cell:number) {}
  rebuild(items:T[]) { this.buckets.clear();for(const item of items){const key=this.key(item.x,item.y);const bucket=this.buckets.get(key);if(bucket) bucket.push(item);else this.buckets.set(key,[item]);} }
  query(x:number,y:number,r:number):T[] {
    const result:T[]=[];
    for(let i=Math.floor((x-r)/this.cell);i<=Math.floor((x+r)/this.cell);i++)
      for(let j=Math.floor((y-r)/this.cell);j<=Math.floor((y+r)/this.cell);j++) {
        const bucket=this.buckets.get(`${i},${j}`);if(bucket) result.push(...bucket);
      }
    return result;
  }
  private key(x:number,y:number){return `${Math.floor(x/this.cell)},${Math.floor(y/this.cell)}`;}
}
