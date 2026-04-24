import { describe, expect, it } from 'vitest';
import { inferGpuTier } from '@/boot/capability-probe';

describe('inferGpuTier', () => {
  it('classifies high-end discrete GPUs as high', () => {
    expect(inferGpuTier('NVIDIA GeForce RTX 4090')).toBe('high');
    expect(inferGpuTier('AMD Radeon RX 7900 XT')).toBe('high');
    expect(inferGpuTier('Apple M2 Max')).toBe('high');
  });

  it('classifies integrated / mobile GPUs as low', () => {
    expect(inferGpuTier('Intel(R) UHD Graphics 620')).toBe('low');
    expect(inferGpuTier('Intel Iris Xe Graphics')).toBe('low');
    expect(inferGpuTier('Mali-G78')).toBe('low');
    expect(inferGpuTier('Adreno 660')).toBe('low');
    expect(inferGpuTier('PowerVR GE8320')).toBe('low');
  });

  it('classifies unknown / mid-range GPUs as mid', () => {
    expect(inferGpuTier('NVIDIA GeForce GTX 1660')).toBe('mid');
    expect(inferGpuTier('Apple M1')).toBe('mid');
    expect(inferGpuTier('unknown')).toBe('mid');
  });
});
