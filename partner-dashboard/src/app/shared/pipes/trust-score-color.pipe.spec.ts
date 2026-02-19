import { TrustScoreColorPipe } from './trust-score-color.pipe';

describe('TrustScoreColorPipe', () => {
  let pipe: TrustScoreColorPipe;

  beforeEach(() => {
    pipe = new TrustScoreColorPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('null and undefined handling', () => {
    it('should return gray for null', () => {
      expect(pipe.transform(null)).toBe('gray');
    });

    it('should return gray for undefined', () => {
      expect(pipe.transform(undefined)).toBe('gray');
    });
  });

  describe('green color (score > 80)', () => {
    it('should return green for score 81', () => {
      expect(pipe.transform(81)).toBe('green');
    });

    it('should return green for score 90', () => {
      expect(pipe.transform(90)).toBe('green');
    });

    it('should return green for score 95', () => {
      expect(pipe.transform(95)).toBe('green');
    });

    it('should return green for score 100', () => {
      expect(pipe.transform(100)).toBe('green');
    });

    it('should return green for score 99.9', () => {
      expect(pipe.transform(99.9)).toBe('green');
    });
  });

  describe('yellow color (score 50-80)', () => {
    it('should return yellow for score 50', () => {
      expect(pipe.transform(50)).toBe('yellow');
    });

    it('should return yellow for score 60', () => {
      expect(pipe.transform(60)).toBe('yellow');
    });

    it('should return yellow for score 70', () => {
      expect(pipe.transform(70)).toBe('yellow');
    });

    it('should return yellow for score 80', () => {
      expect(pipe.transform(80)).toBe('yellow');
    });

    it('should return yellow for score 75.5', () => {
      expect(pipe.transform(75.5)).toBe('yellow');
    });

    it('should return yellow for score 50.1', () => {
      expect(pipe.transform(50.1)).toBe('yellow');
    });

    it('should return yellow for score 79.9', () => {
      expect(pipe.transform(79.9)).toBe('yellow');
    });
  });

  describe('red color (score < 50)', () => {
    it('should return red for score 0', () => {
      expect(pipe.transform(0)).toBe('red');
    });

    it('should return red for score 10', () => {
      expect(pipe.transform(10)).toBe('red');
    });

    it('should return red for score 25', () => {
      expect(pipe.transform(25)).toBe('red');
    });

    it('should return red for score 49', () => {
      expect(pipe.transform(49)).toBe('red');
    });

    it('should return red for score 49.9', () => {
      expect(pipe.transform(49.9)).toBe('red');
    });

    it('should return red for score 0.1', () => {
      expect(pipe.transform(0.1)).toBe('red');
    });
  });

  describe('boundary conditions', () => {
    it('should return yellow for exactly 50', () => {
      expect(pipe.transform(50)).toBe('yellow');
    });

    it('should return yellow for exactly 80', () => {
      expect(pipe.transform(80)).toBe('yellow');
    });

    it('should return green for 80.1', () => {
      expect(pipe.transform(80.1)).toBe('green');
    });

    it('should return red for 49.9', () => {
      expect(pipe.transform(49.9)).toBe('red');
    });
  });

  describe('edge cases', () => {
    it('should handle negative scores', () => {
      expect(pipe.transform(-10)).toBe('red');
    });

    it('should handle scores above 100', () => {
      expect(pipe.transform(150)).toBe('green');
    });

    it('should handle very small positive scores', () => {
      expect(pipe.transform(0.001)).toBe('red');
    });

    it('should handle very large scores', () => {
      expect(pipe.transform(999999)).toBe('green');
    });

    it('should handle decimal precision', () => {
      expect(pipe.transform(80.00000001)).toBe('green');
    });

    it('should handle zero', () => {
      expect(pipe.transform(0)).toBe('red');
    });

    it('should handle NaN', () => {
      expect(pipe.transform(NaN)).toBe('red');
    });

    it('should handle Infinity', () => {
      expect(pipe.transform(Infinity)).toBe('green');
    });

    it('should handle negative Infinity', () => {
      expect(pipe.transform(-Infinity)).toBe('red');
    });
  });

  describe('typical use cases', () => {
    it('should correctly classify high trust scores', () => {
      const highScores = [85, 90, 95, 100];
      highScores.forEach(score => {
        expect(pipe.transform(score)).toBe('green');
      });
    });

    it('should correctly classify medium trust scores', () => {
      const mediumScores = [50, 60, 70, 80];
      mediumScores.forEach(score => {
        expect(pipe.transform(score)).toBe('yellow');
      });
    });

    it('should correctly classify low trust scores', () => {
      const lowScores = [0, 10, 25, 40, 49];
      lowScores.forEach(score => {
        expect(pipe.transform(score)).toBe('red');
      });
    });
  });
});
