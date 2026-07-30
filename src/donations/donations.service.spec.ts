import { ContributionInputType } from '@prisma/client';
import { DonationsService } from './donations.service';

describe('DonationsService contribution calculation', () => {
  const service = new DonationsService({} as never);

  function campaign(
    inputType: ContributionInputType,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      donationConfig: {
        inputType,
        currency: 'IDR',
        minimumAmount: inputType === 'MONEY' ? BigInt(25_000) : null,
        maximumAmount: null,
        allowCustomAmount: true,
        unitPrice: inputType === 'QUANTITY' ? BigInt(25_000) : null,
        minimumQuantity: inputType === 'QUANTITY' ? 1 : null,
        maximumQuantity: null,
        quantityStep: inputType === 'QUANTITY' ? 1 : null,
        ...overrides,
      },
      donationOptions: [{ amount: BigInt(25_000) }],
      paymentMethods: [],
    };
  }

  function calculate(value: unknown, input: unknown) {
    return (
      service as unknown as {
        calculate: (campaign: unknown, input: unknown) => {
          baseAmount: bigint;
          quantity: number | null;
        };
      }
    ).calculate(value, input);
  }

  it('uses amount as MONEY base amount', () => {
    expect(
      calculate(campaign(ContributionInputType.MONEY), {
        contribution: { amount: 50_000 },
      }),
    ).toEqual({ baseAmount: BigInt(50_000), quantity: null });
  });

  it('rejects MONEY below campaign minimum', () => {
    expect(() =>
      calculate(campaign(ContributionInputType.MONEY), {
        contribution: { amount: 10_000 },
      }),
    ).toThrow('Nominal donasi berada di bawah minimum campaign.');
  });

  it('calculates QUANTITY from backend unit price', () => {
    expect(
      calculate(campaign(ContributionInputType.QUANTITY), {
        contribution: { quantity: 2 },
      }),
    ).toEqual({ baseAmount: BigInt(50_000), quantity: 2 });
  });

  it('rejects a contribution shape that does not match the campaign', () => {
    expect(() =>
      calculate(campaign(ContributionInputType.QUANTITY), {
        contribution: { amount: 50_000 },
      }),
    ).toThrow('Campaign ini hanya menerima kontribusi berupa kuantitas.');
  });
});
