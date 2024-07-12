export class FileDto {
  constructor(
    public originalname: string,
    public mimetype: string,
    public buffer: any,
    public size: number
  ) {}
}
