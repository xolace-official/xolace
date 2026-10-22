import { describe, it, expect } from 'vitest';
import { COUNTRY_RESOURCES } from '@/src/features/crisis-resources/data';
import type { Resource } from '@/src/features/crisis-resources/types';

const VALID_TYPES = new Set<Resource['type']>(['phone', 'url', 'text', 'email']);
const VALID_SOURCES = new Set<Resource['source']>(['crisis_line', 'xolace_support', 'text_support', 'local_service', 'online_resource']);

describe('country resolution', () => {
  it('all countries have emergencyNumber', () => {
    Object.values(COUNTRY_RESOURCES).forEach((c) => expect(c.emergencyNumber).toBeTruthy());
  });

  it('emergencyNumber not duplicated in resources[]', () => {
    Object.values(COUNTRY_RESOURCES).forEach((c) => {
      const hasEmergency = c.resources.some(
        (r) => r.value === c.emergencyNumber && r.type === 'phone',
      );
      expect(hasEmergency).toBe(false);
    });
  });

  it('resources are pre-sorted (priority ascending)', () => {
    Object.values(COUNTRY_RESOURCES).forEach((c) => {
      for (let i = 1; i < c.resources.length; i++) {
        expect(c.resources[i].priority).toBeGreaterThanOrEqual(c.resources[i - 1].priority);
      }
    });
  });
});

describe('data completeness', () => {
  it('every country has a non-empty name and flag', () => {
    Object.values(COUNTRY_RESOURCES).forEach((c) => {
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.flag.length).toBeGreaterThan(0);
    });
  });

  it('every country has at least one resource', () => {
    Object.values(COUNTRY_RESOURCES).forEach((c) => {
      expect(c.resources.length).toBeGreaterThan(0);
    });
  });

});

describe('resource shape validation', () => {
  it('all resources have valid type values', () => {
    Object.values(COUNTRY_RESOURCES).forEach((c) => {
      c.resources.forEach((r) => {
        expect(VALID_TYPES.has(r.type)).toBe(true);
      });
    });
  });

  it('all resources have valid source values', () => {
    Object.values(COUNTRY_RESOURCES).forEach((c) => {
      c.resources.forEach((r) => {
        expect(VALID_SOURCES.has(r.source)).toBe(true);
      });
    });
  });

  it('all resources have positive integer priority', () => {
    Object.values(COUNTRY_RESOURCES).forEach((c) => {
      c.resources.forEach((r) => {
        expect(Number.isInteger(r.priority)).toBe(true);
        expect(r.priority).toBeGreaterThan(0);
      });
    });
  });

  it('all resources have non-empty label and value', () => {
    Object.values(COUNTRY_RESOURCES).forEach((c) => {
      c.resources.forEach((r) => {
        expect(r.label.length).toBeGreaterThan(0);
        expect(r.value.length).toBeGreaterThan(0);
      });
    });
  });

  it('phone resources have a non-empty dial value (no spaces-only strings)', () => {
    Object.values(COUNTRY_RESOURCES).forEach((c) => {
      c.resources.filter((r) => r.type === 'phone').forEach((r) => {
        expect(r.value.trim().length).toBeGreaterThan(0);
      });
    });
  });

  it('url resources have values that start with http:// or https://', () => {
    Object.values(COUNTRY_RESOURCES).forEach((c) => {
      c.resources.filter((r) => r.type === 'url').forEach((r) => {
        expect(r.value).toMatch(/^https?:\/\//);
      });
    });
  });
});
