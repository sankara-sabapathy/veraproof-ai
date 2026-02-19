import { DateFormatPipe } from './date-format.pipe';

describe('DateFormatPipe', () => {
  let pipe: DateFormatPipe;

  beforeEach(() => {
    pipe = new DateFormatPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('null and undefined handling', () => {
    it('should return empty string for null', () => {
      expect(pipe.transform(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(pipe.transform(undefined)).toBe('');
    });
  });

  describe('valid date formatting', () => {
    const testDate = new Date('2024-01-15T10:30:45Z');

    it('should format date with short format', () => {
      const result = pipe.transform(testDate, 'short');
      expect(result).toContain('1/15/2024');
    });

    it('should format date with medium format (default)', () => {
      const result = pipe.transform(testDate, 'medium');
      expect(result).toBeTruthy();
      expect(result).not.toBe('Invalid Date');
    });

    it('should format date with long format', () => {
      const result = pipe.transform(testDate, 'long');
      expect(result).toContain('January');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('should use medium format when no format specified', () => {
      const result = pipe.transform(testDate);
      expect(result).toBeTruthy();
      expect(result).not.toBe('Invalid Date');
    });
  });

  describe('string date input', () => {
    it('should parse and format ISO string date', () => {
      const isoString = '2024-01-15T10:30:45Z';
      const result = pipe.transform(isoString, 'short');
      expect(result).toContain('2024');
    });

    it('should parse and format date string', () => {
      const dateString = '2024-01-15';
      const result = pipe.transform(dateString, 'short');
      expect(result).toBeTruthy();
      expect(result).not.toBe('Invalid Date');
    });

    it('should handle timestamp string', () => {
      const timestamp = '1705315845000';
      const result = pipe.transform(timestamp, 'short');
      expect(result).toBeTruthy();
    });
  });

  describe('invalid date handling', () => {
    it('should return "Invalid Date" for invalid date string', () => {
      expect(pipe.transform('not a date')).toBe('Invalid Date');
    });

    it('should return "Invalid Date" for malformed date', () => {
      expect(pipe.transform('2024-13-45')).toBe('Invalid Date');
    });

    it('should return empty string for empty string', () => {
      expect(pipe.transform('')).toBe('');
    });

    it('should handle Date object with invalid value', () => {
      const invalidDate = new Date('invalid');
      expect(pipe.transform(invalidDate)).toBe('Invalid Date');
    });
  });

  describe('edge cases', () => {
    it('should handle very old dates', () => {
      const oldDate = new Date('1900-01-01');
      const result = pipe.transform(oldDate, 'short');
      expect(result).toBeTruthy();
      expect(result).not.toBe('Invalid Date');
    });

    it('should handle future dates', () => {
      const futureDate = new Date('2099-12-31');
      const result = pipe.transform(futureDate, 'short');
      expect(result).toContain('2099');
    });

    it('should handle dates at midnight', () => {
      const midnightDate = new Date('2024-01-15T00:00:00Z');
      const result = pipe.transform(midnightDate, 'short');
      expect(result).toBeTruthy();
      expect(result).not.toBe('Invalid Date');
    });

    it('should handle dates at end of day', () => {
      const endOfDay = new Date('2024-01-15T23:59:59Z');
      const result = pipe.transform(endOfDay, 'short');
      expect(result).toBeTruthy();
      expect(result).not.toBe('Invalid Date');
    });

    it('should handle leap year dates', () => {
      const leapDay = new Date('2024-02-29T12:00:00Z');
      const result = pipe.transform(leapDay, 'short');
      expect(result).toBeTruthy();
      expect(result).not.toBe('Invalid Date');
    });

    it('should handle Unix epoch', () => {
      const epoch = new Date(0);
      const result = pipe.transform(epoch, 'short');
      expect(result).toBeTruthy();
      expect(result).not.toBe('Invalid Date');
    });
  });

  describe('format variations', () => {
    const testDate = new Date('2024-06-15T14:30:00Z');

    it('should produce different outputs for different formats', () => {
      const shortResult = pipe.transform(testDate, 'short');
      const mediumResult = pipe.transform(testDate, 'medium');
      const longResult = pipe.transform(testDate, 'long');

      expect(shortResult).not.toBe(mediumResult);
      expect(mediumResult).not.toBe(longResult);
      expect(shortResult).not.toBe(longResult);
    });

    it('should handle invalid format gracefully', () => {
      const result = pipe.transform(testDate, 'invalid' as any);
      expect(result).toBeTruthy();
      expect(result).not.toBe('Invalid Date');
    });
  });
});
