import { MediaService, contentHash } from './media.service';

describe('media library', () => {
  it('hashes identical bytes to the same digest', () => {
    const bytes = Buffer.from('same-image');
    expect(contentHash(bytes)).toBe(contentHash(Buffer.from('same-image')));
    expect(contentHash(bytes)).not.toBe(contentHash(Buffer.from('other-image')));
  });

  it('returns the existing asset and does not store the file again', async () => {
    const existing = {
      id: 'asset-1',
      url: 'http://localhost:4000/uploads/aurora.png',
      filename: 'aurora.png',
      mimeType: 'image/png',
      byteSize: 12,
    };
    const prisma = {
      mediaAsset: {
        findUnique: jest.fn().mockResolvedValue(existing),
        create: jest.fn(),
      },
    };
    const storage = { uploadBuffer: jest.fn() };
    const service = new MediaService(prisma as never, storage as never);
    const file = {
      buffer: Buffer.from('same-image'),
      originalname: 'copy.png',
      mimetype: 'image/png',
      size: 12,
    };

    const result = await service.upload('tenant-1', file);

    expect(result).toEqual({ ...existing, duplicate: true });
    expect(storage.uploadBuffer).not.toHaveBeenCalled();
    expect(prisma.mediaAsset.create).not.toHaveBeenCalled();
  });

  it('stores a new image when the hash is new', async () => {
    const prisma = {
      mediaAsset: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      },
    };
    const storage = {
      uploadBuffer: jest.fn().mockResolvedValue({ url: 'http://localhost:4000/uploads/new.png', key: 'new' }),
    };
    const service = new MediaService(prisma as never, storage as never);

    const result = await service.upload('tenant-1', {
      buffer: Buffer.from('new-image'),
      originalname: 'new.png',
      mimetype: 'image/png',
      size: 9,
    });

    expect(storage.uploadBuffer).toHaveBeenCalledTimes(1);
    expect(prisma.mediaAsset.create).toHaveBeenCalledTimes(1);
    expect(result.duplicate).toBe(false);
    expect(result.url).toBe('http://localhost:4000/uploads/new.png');
  });
});
