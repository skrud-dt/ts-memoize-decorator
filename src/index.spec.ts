/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { Memoize } from './index';

describe('Memoize()', () => {
  describe('when decorating a get accessor', () => {
    const spy = jest.fn();

    beforeEach(() => spy.mockClear());

    class MyClass {
      constructor(private v: number) {}

      @Memoize()
      public get value(): number {
        spy();
        return this.v;
      }
    }

    it('get accessor return value is memoized', () => {
      const a = new MyClass(1);

      expect(a.value).toEqual(1);
      expect(a.value).toEqual(1);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("multiple instances don't share get accessor cache", () => {
      const a = new MyClass(1);
      const b = new MyClass(2);

      expect(a.value).toEqual(1);
      expect(b.value).toEqual(2);
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('when decorating a method without arguments', () => {
    const spy = jest.fn();

    beforeEach(() => spy.mockClear());

    class MyClass {
      @Memoize()
      public getNumber(): number {
        spy();
        return Math.random();
      }
    }

    it('niladic method return value is memoized', () => {
      const a = new MyClass();
      expect(a.getNumber()).toEqual(a.getNumber());
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("multiple instances don't share niladic method cache", () => {
      const a = new MyClass();
      const b = new MyClass();
      expect(a.getNumber()).not.toEqual(b.getNumber());
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('when decorating a method of one argument', () => {
    describe('when argument is primitive', () => {
      const spy = jest.fn();

      beforeEach(() => spy.mockClear());

      class MyClass {
        @Memoize()
        public getGreeting(name: string): string {
          spy();
          return `Hello, ${name}`;
        }
      }

      it('return value of monadic method is memoized', () => {
        const a = new MyClass();

        expect(a.getGreeting('John')).toEqual('Hello, John');
        expect(a.getGreeting('John')).toEqual('Hello, John');
        expect(spy).toHaveBeenCalledTimes(1);
      });

      it('different values are being returned for different arguments', () => {
        const a = new MyClass();

        expect(a.getGreeting('Alice')).toEqual('Hello, Alice');
        expect(a.getGreeting('Bob')).toEqual('Hello, Bob');
        expect(spy).toHaveBeenCalledTimes(2);
      });

      it("multiple instances don't share monadic method cache", () => {
        const a = new MyClass();
        const b = new MyClass();

        expect(a.getGreeting('Alice')).toEqual('Hello, Alice');
        expect(b.getGreeting('Alice')).toEqual('Hello, Alice');
        expect(spy).toHaveBeenCalledTimes(2);
      });
    });

    describe('when argument is non-primitive, and hash function is provided', () => {
      const spy = jest.fn();

      beforeEach(() => spy.mockClear());

      type User = { id: number; name: string };

      class MyClass {
        @Memoize((u: User) => `${u.id}`)
        public getGreeting(user: User): string {
          spy();
          return `Hello, ${user.name}`;
        }
      }

      it('return value for arguments that produce the same hash is memoized', () => {
        const a = new MyClass();

        expect(a.getGreeting({ id: 1, name: 'John' })).toEqual('Hello, John');
        expect(a.getGreeting({ id: 1, name: 'John' })).toEqual('Hello, John');
        expect(spy).toHaveBeenCalledTimes(1);
      });

      it('method is being re-evaluated for arguments that produce different hash', () => {
        const a = new MyClass();

        expect(a.getGreeting({ id: 1, name: 'John' })).toEqual('Hello, John');
        expect(a.getGreeting({ id: 2, name: 'John' })).toEqual('Hello, John');
        expect(spy).toHaveBeenCalledTimes(2);
      });

      it('cache is not shared between two instances of the same class', () => {
        const a = new MyClass();
        const b = new MyClass();

        expect(a.getGreeting({ id: 1, name: 'Alice' })).toEqual('Hello, Alice');
        expect(b.getGreeting({ id: 1, name: 'Alice' })).toEqual('Hello, Alice');
        expect(spy).toHaveBeenCalledTimes(2);
      });
    });

    describe('when argument is non-primitive, and hash function is not provided', () => {
      const spy = jest.fn();

      type User = { id: number; name: string };

      class MyClass {
        @Memoize()
        public getGreeting(user: User): string {
          spy();
          return `Hello, ${user.name}`;
        }
      }

      it('an error asking for explicit hashFunction is thrown', () => {
        const a = new MyClass();
        expect(() => a.getGreeting({ id: 1, name: 'John' }))
          .toThrowErrorMatchingInlineSnapshot(`
"You are applying decorator to a method that accepts arguments of non-promitive types. 
Please provide and explicit hashFunction that deterministically converts arguments 
to a primitive type, like so: @Memoize((u: User, c: Company)=>\`\${u.id}:\${c.id}\`)"
`);
        expect(spy).not.toHaveBeenCalled();
      });
    });
  });

  describe('when decorating a method of multiple arguments', () => {
    describe('when hash function is provided', () => {
      const spy = jest.fn();
      beforeEach(() => spy.mockClear());

      class MyClass {
        @Memoize({ hashFunction: (a: number, b: number) => `${a}:${b}` })
        public multiply(a: number, b: number) {
          spy();
          return a * b;
        }
      }

      it('return value for arguments that produce the same hash is memoized', () => {
        const a = new MyClass();
        const val1 = a.multiply(4, 6);
        const val2 = a.multiply(4, 6);

        expect(val1).toEqual(24);
        expect(val2).toEqual(24);
        expect(spy).toHaveBeenCalledTimes(1);
      });

      it("multiple instances don't share poliadic method cache", () => {
        const a = new MyClass();
        const b = new MyClass();

        expect(a.multiply(2, 5)).toEqual(10);
        expect(b.multiply(2, 5)).toEqual(10);

        expect(spy).toHaveBeenCalledTimes(2);
      });
    });

    describe('when hash function is not provided', () => {
      let spy: jest.Mock;

      beforeEach(() => {
        spy = jest.fn();
      });

      class MyClass {
        @Memoize()
        public multiply(a: number, b: number): number {
          spy();
          return a * b;
        }
      }

      it('an error asking for explicit hashFunction is thrown', () => {
        const a = new MyClass();
        expect(() => a.multiply(1, 2)).toThrowErrorMatchingInlineSnapshot(`
"You are applying decorator to a method that accepts arguments of non-promitive types. 
Please provide and explicit hashFunction that deterministically converts arguments 
to a primitive type, like so: @Memoize((u: User, c: Company)=>\`\${u.id}:\${c.id}\`)"
`);
      });
    });
  });

  describe('when decorating class', () => {
    it('an error is being thrown', () => {
      expect(() => {
        //@ts-ignore
        @Memoize()
        class MyClass {}
      }).toThrow('Only put a Memoize() decorator on a method or get accessor.');
    });
  });

  describe('when decorating a setter', () => {
    it('an error is being thrown', () => {
      expect(() => {
        class MyClass {
          @Memoize()
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          set name(name: string) {}
        }
      }).toThrow('Only put a Memoize() decorator on a method or get accessor.');
    });
  });
});

describe('custom cache implementation', () => {
  test('node-lfu-cache', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const LFU = require('node-lfu-cache');

    const spy = jest.fn();

    class MyClass {
      @Memoize({ cacheFactory: () => LFU(2) })
      public getGreeting(name: string) {
        spy(name);
        return `Hello, ${name}`;
      }
    }

    const instance = new MyClass();

    instance.getGreeting('Alice');
    instance.getGreeting('Alice');
    instance.getGreeting('Bob');
    expect(spy).toHaveBeenCalledTimes(2);
    instance.getGreeting('Martha');
    instance.getGreeting('Martha');
    expect(spy).toHaveBeenCalledTimes(3);
    instance.getGreeting('Bob');
    expect(spy).toHaveBeenCalledTimes(4);
  });
});
