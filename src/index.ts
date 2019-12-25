/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-use-before-define */

type Primitive = number | string | boolean;

type HashFunction = (...args: any[]) => string;
interface Cache {
  get(key: Primitive): any | undefined;
  has(key: Primitive): boolean;
  set(key: Primitive, value: any);
}
type CacheFactory = () => Cache;

type Options = {
  hashFunction?: HashFunction;
  cacheFactory: CacheFactory;
};

export function Memoize(
  args?: Partial<Options> | HashFunction,
): MethodDecorator {
  const options = normalizeOptions(args);
  return function(target, propertyKey, descriptor) {
    if (descriptor?.value) {
      // A case of a get accessor
      descriptor.value = getNewFunction(
        descriptor.value as any,
        options?.hashFunction,
        options.cacheFactory,
        Symbol(),
      ) as any;
    } else if (descriptor?.get) {
      // In case of a method
      descriptor.get = getNewFunction(
        descriptor.get,
        options?.hashFunction,
        options.cacheFactory,
        Symbol(),
      );
    } else {
      throw 'Only put a Memoize() decorator on a method or get accessor.';
    }
  };
}

function getNewFunction<T>(
  originalMethod: () => T,
  hashFunction: (...args: unknown[]) => string,
  cacheFactory: CacheFactory,
  storageKey: symbol,
) {
  // The function returned here gets called instead of originalMethod.
  return function(...args: unknown[]) {
    if (args.length > 0) {
      return getNonZeroArgsDecorator.call(
        this,
        originalMethod,
        args,
        hashFunction,
        cacheFactory,
        storageKey,
      );
    } else {
      return getZeroArgsDecorator.call(this, originalMethod, storageKey);
    }
  };
}

function getZeroArgsDecorator<T>(originalMethod: () => T, storageKey: symbol) {
  if (!this[storageKey]) {
    this[storageKey] = originalMethod.apply(this);
  }
  return this[storageKey];
}

function getNonZeroArgsDecorator<T, A extends unknown[]>(
  originalMethod: (...args: A) => T,
  args: A,
  hashFunction: (...args: A) => string,
  cacheFactory: CacheFactory,
  storageKey: symbol,
) {
  let returnedValue: T;

  // Get or create cache
  if (!this[storageKey]) {
    this[storageKey] = cacheFactory();
  }
  const cache = this[storageKey];

  let hashKey: Primitive;

  if (args.length === 1 && isPrimitive(args[0])) {
    hashKey = args[0];
  } else if (hashFunction) {
    hashKey = hashFunction.apply(this, args);
  } else {
    throw new Error(
      `You are applying decorator to a method that accepts arguments of non-promitive types. 
Please provide and explicit hashFunction that deterministically converts arguments 
to a primitive type, like so: @Memoize((u: User, c: Company)=>\`\${u.id}:\${c.id}\`)`,
    );
  }

  if (cache.has(hashKey)) {
    returnedValue = cache.get(hashKey);
  } else {
    returnedValue = originalMethod.apply(this, args);
    cache.set(hashKey, returnedValue);
  }

  return returnedValue;
}

function normalizeOptions(
  options: Partial<Options> | HashFunction | undefined,
): Options {
  const defaultCacheFactory = () => new Map();
  if (options === undefined) {
    return { cacheFactory: defaultCacheFactory };
  }
  if (typeof options === 'function') {
    options = { hashFunction: options, cacheFactory: defaultCacheFactory };
  }
  if (!options.cacheFactory) {
    options.cacheFactory = defaultCacheFactory;
  }
  return options as Options;
}

const isPrimitive = (value: unknown): value is Primitive =>
  value === null ||
  typeof value === 'number' ||
  typeof value === 'boolean' ||
  typeof value === 'string';
