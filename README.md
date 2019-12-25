# ts-memoize-decorator

Simple memoization decorator for TypeScript.

> In computing, memoization or memoisation is an optimization technique used primarily to speed up computer programs by storing the results of expensive function calls and returning the cached result when the same inputs occur again.
> - https://en.wikipedia.org/wiki/Memoization



## Installation
```npm install --save ts-memoize-decorator```

## Usage:

```typescript
type Primitive = string | number | boolean

@Memoize(hashFunction?: (...args: any[]) => Primitive)
```

or 

```typescript
interface Cache {
  get(key: Primitive): any | undefined;
  has(key: Primitive): boolean;
  set(key: Primitive, value: any);
}

@Memoize({ 
  hashFunction?: (...args: any[]) => Primitive,
  cacheFactory?: () => Cache
}) 
```

`hashFunction` accepts the same arguments as original method, and should return a value of a primitive type (a string or a number, and not an object of an array) that identifies that set of arguments deterministically (i.e. subsequent calls with an equal arguments will produce the same result).

`cacheFactory` parameter allows you to override default cache (`new Map()`). See tests for example of integration with [node-lfu-cache](https://www.npmjs.com/package/node-lfu-cache)

`hashFunction` may be omitted in the following cases:

1) decorated method is a get accessor
```typescript
class MyClass {
    @Memoize()
    public get piSquared(): number {
        return Math.PI * Math.PI;
    }
}
```

2) decorated method is a method of zero arguments
```typescript
class MyClass {
    @Memoize()
    public getHalfPI(): number {
        return Math.PI / 2;
    }
}
```

3) decorated method is a method of one argument, and the argument is of primitive value itself
```typescript
class MyClass {
    @Memoize()
    public getAreaOfACircle(radius: number): number {
        return Math.PI * Math.pow(radius, 2);
    }
}
```

When using this decorator on a method that accepts an argument of a complex type, or a method of multiple arguments, `hashFunction` MUST be provided:

```typescript
class MyClass {
    @Memoize((u: User) => u.id)
    public getUserBalance(user: User): number {
        return user.calculateBalance()
    }
}
```

This rule is enforced by throwing an exception at runtime.
This is done to ensure that usage of `@Memoize` does not cause memory leaks by referencing potentially heavy objects as a cache keys, and also reduces cache size by providing smallest keys possible (contrary to implementations that choose to construct cache keys using `JSON.stringify`)
