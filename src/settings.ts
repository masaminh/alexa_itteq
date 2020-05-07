const region = process.env.REGION ?? '';
const bucket = process.env.BUCKET ?? '';
const key = process.env.KEY ?? '';

export default class {
  public static getRegion(): string {
    return region;
  }

  public static getBucket(): string {
    return bucket;
  }

  public static getKey(): string {
    return key;
  }
}
