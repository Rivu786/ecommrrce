import { CartService } from './cart.service';

describe('guest cart merge', () => {
  it('requires userId or sessionId', async () => {
    const prisma = {
      cart: { findFirst: jest.fn(), create: jest.fn() },
    };
    const svc = new CartService(prisma as any, {} as any);
    await expect(svc.getOrCreate('t1', {})).rejects.toThrow();
  });

  it('merges guest session into user cart when both ids are present', async () => {
    const guestItems = [{ variantId: 'v1', quantity: 2, addonsJson: null, notes: null }];
    const prisma = {
      cart: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'guest', items: guestItems })
          .mockResolvedValueOnce({ id: 'user', items: [] }),
        delete: jest.fn(),
      },
      cartItem: { upsert: jest.fn() },
    };
    const svc = new CartService(prisma as any, {} as any);
    svc.getById = jest.fn().mockResolvedValue({ id: 'user' });
    await svc.getOrCreate('t1', { userId: 'u1', sessionId: 'sess' });
    expect(prisma.cartItem.upsert).toHaveBeenCalled();
    expect(prisma.cart.delete).toHaveBeenCalledWith({ where: { id: 'guest' } });
  });
});
