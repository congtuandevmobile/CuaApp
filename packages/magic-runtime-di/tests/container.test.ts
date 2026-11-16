import { describe, expect, test } from "@jest/globals";
import {
  all,
  bind,
  Container,
  Decorates,
  DiError,
  Injectable,
  inner,
  input,
  Module,
  optional,
  options,
  Provides,
  token,
} from "../src";

interface Clock {
  now(): number;
}
const Clock = token<Clock>("Clock");
const BaseUrl = input<string>("baseUrl");

interface Sink {
  record(line: string): void;
}
const Sink = token<Sink>("Sink");

@Injectable([])
class FixedClock implements Clock {
  now(): number {
    return 42;
  }
}

@Injectable([Clock, BaseUrl])
class Api {
  constructor(
    readonly clock: Clock,
    readonly url: string,
  ) {}
}

@Injectable([Api, Clock])
class Repo {
  constructor(
    readonly api: Api,
    readonly clock: Clock,
  ) {}
}

const shop = [bind(Clock).toClass(FixedClock), FixedClock, Api, Repo];

describe("Container", () => {
  test("builds the graph from the declared dependency order and shares singletons", () => {
    const container = Container.create({
      providers: [...shop, bind(BaseUrl).toValue("https://x")],
    });

    const repo = container.get(Repo);

    expect(repo.api.url).toBe("https://x");
    expect(repo.clock).toBe(repo.api.clock);
    expect(container.get(Repo)).toBe(repo);
  });

  test("transient providers are built every time", () => {
    @Injectable([], { scope: "transient" })
    class Ticket {}
    @Injectable([Ticket])
    class Desk {
      constructor(readonly ticket: Ticket) {}
    }

    const container = Container.create({ providers: [Ticket, Desk] });

    expect(container.get(Ticket)).not.toBe(container.get(Ticket));
    expect(container.get(Desk).ticket).toBe(container.get(Desk).ticket);
  });

  test("constructors do not run until a value is asked for", () => {
    let built = 0;
    @Injectable([])
    class Heavy {
      constructor() {
        built += 1;
      }
    }

    const container = Container.create({ providers: [Heavy] });
    expect(built).toBe(0);

    container.get(Heavy);
    container.get(Heavy);
    expect(built).toBe(1);
  });

  test("factories receive their dependencies in order", () => {
    const Greeting = token<string>("Greeting");
    const container = Container.create({
      providers: [
        FixedClock,
        bind(Clock).toClass(FixedClock),
        bind(Greeting).toFactory([Clock], (clock) => `t=${clock.now()}`),
      ],
    });

    expect(container.get(Greeting)).toBe("t=42");
  });

  test("optional dependencies are undefined when nothing provides them", () => {
    const Maybe = token<number>("Maybe");
    @Injectable([optional(Maybe)])
    class Uses {
      constructor(readonly maybe: number | undefined) {}
    }

    expect(Container.create({ providers: [Uses] }).get(Uses).maybe).toBeUndefined();
    expect(Container.create({ providers: [Uses, bind(Maybe).toValue(7)] }).get(Uses).maybe).toBe(7);
  });
});

describe("options objects", () => {
  const Retries = token<number>("Retries");

  @Injectable([options({ clock: Clock, retries: optional(Retries) })])
  class Policy {
    constructor(readonly opts: { clock: Clock; retries?: number }) {}
  }

  test("each property is a dependency and a missing optional one is left out", () => {
    const base = [FixedClock, bind(Clock).toClass(FixedClock), Policy];

    const without = Container.create({ providers: base }).get(Policy).opts;
    const given = Container.create({ providers: [...base, bind(Retries).toValue(3)] }).get(
      Policy,
    ).opts;

    expect(without.clock.now()).toBe(42);
    expect("retries" in without).toBe(false);
    expect(given.retries).toBe(3);
  });

  test("a property of the wrong type does not compile (tsc proves this)", () => {
    // @ts-expect-error clock must be a Clock
    @Injectable([options({ clock: BaseUrl })])
    class Wrong {
      constructor(readonly opts: { clock: Clock }) {}
    }

    expect(Wrong).toBeDefined();
  });
});

describe("lists", () => {
  interface Method {
    id: string;
  }
  const Method = token<Method>("Method");

  @Injectable([])
  @Provides(Method, { multi: true })
  class Email implements Method {
    id = "email";
  }
  @Injectable([])
  @Provides(Method, { multi: true })
  class Guest implements Method {
    id = "guest";
  }
  @Injectable([all(Method)])
  class Registry {
    constructor(readonly methods: readonly Method[]) {}
  }

  test("all(T) receives every member in the order the providers are listed", () => {
    const first = Container.create({ providers: [Email, Guest, Registry] });
    const second = Container.create({ providers: [Guest, Email, Registry] });

    expect(first.get(Registry).methods.map((m) => m.id)).toEqual(["email", "guest"]);
    expect(second.get(Registry).methods.map((m) => m.id)).toEqual(["guest", "email"]);
    expect(first.getAll(Method)).toHaveLength(2);
  });

  test("an empty list is an error unless the dependency is optional", () => {
    expect(() => Container.create({ providers: [Registry] })).toThrow(
      "No provider for all(Method)",
    );
  });

  test("injecting a list token as a single value says so", () => {
    @Injectable([Method])
    class Wrong {
      constructor(readonly method: Method) {}
    }

    expect(() => Container.create({ providers: [Email, Guest, Wrong] })).toThrow(
      "is provided as a list",
    );
  });
});

describe("decorator chains", () => {
  const log: string[] = [];

  @Injectable([])
  @Provides(Sink)
  class Console implements Sink {
    record(line: string): void {
      log.push(`console:${line}`);
    }
  }
  @Injectable([inner(Sink)])
  @Decorates(Sink, { order: 1 })
  class Enrich implements Sink {
    constructor(private readonly next: Sink) {}
    record(line: string): void {
      this.next.record(`${line}+enriched`);
    }
  }
  @Injectable([inner(Sink)])
  @Decorates(Sink, { order: 0 })
  class Consent implements Sink {
    constructor(private readonly next: Sink) {}
    record(line: string): void {
      this.next.record(`${line}+consented`);
    }
  }

  test("the lowest order is outermost and the base is the one that is not a decorator", () => {
    log.length = 0;

    Container.create({ providers: [Console, Enrich, Consent] })
      .get(Sink)
      .record("e");

    expect(log).toEqual(["console:e+consented+enriched"]);
  });

  test("the list order decides when no order is given, first is outermost", () => {
    @Injectable([inner(Sink)])
    @Decorates(Sink)
    class A implements Sink {
      constructor(private readonly next: Sink) {}
      record(line: string): void {
        this.next.record(`${line}+a`);
      }
    }
    @Injectable([inner(Sink)])
    @Decorates(Sink)
    class B implements Sink {
      constructor(private readonly next: Sink) {}
      record(line: string): void {
        this.next.record(`${line}+b`);
      }
    }
    log.length = 0;

    Container.create({ providers: [Console, A, B] })
      .get(Sink)
      .record("e");

    expect(log).toEqual(["console:e+a+b"]);
  });

  test("decorators with no base are reported", () => {
    expect(() => Container.create({ providers: [Enrich] })).toThrow("nothing to wrap");
  });
});

describe("overrides", () => {
  test("a fake replaces a provider for everything built on it", () => {
    const fake: Clock = { now: () => 1 };

    const container = Container.create({
      providers: [...shop, bind(BaseUrl).toValue("u")],
      overrides: [bind(Clock).toValue(fake)],
    });

    expect(container.get(Repo).clock.now()).toBe(1);
    expect(container.get(Repo).api.clock).toBe(fake);
  });

  test("overriding a class replaces it under every port it provides", () => {
    interface Store {
      read(): string;
    }
    const Store = token<Store>("Store");
    @Injectable([])
    @Provides(Store)
    class Disk implements Store {
      read = () => "disk";
    }
    @Injectable([Store])
    class Reader {
      constructor(readonly store: Store) {}
    }

    const container = Container.create({
      providers: [Disk, Reader],
      overrides: [bind(Disk).toValue({ read: () => "fake" } as Disk)],
    });

    expect(container.get(Reader).store.read()).toBe("fake");
  });

  test("a module can be assembled from imports and is flat", () => {
    @Module({ providers: [bind(Clock).toClass(FixedClock), FixedClock] })
    class TimeModule {}
    @Module({ imports: [TimeModule], providers: [Api] })
    class NetModule {}

    const container = Container.create({
      modules: [NetModule, TimeModule],
      providers: [bind(BaseUrl).toValue("m")],
    });

    expect(container.get(Api).url).toBe("m");
  });
});

describe("errors name the chain that needed the missing piece", () => {
  test("a missing provider", () => {
    expect(() => Container.create({ providers: [Api, Repo, bind(BaseUrl).toValue("x")] })).toThrow(
      "No provider for `Clock`.",
    );
    expect(() => Container.create({ providers: [Api, Repo, bind(BaseUrl).toValue("x")] })).toThrow(
      "required by: Api",
    );
  });

  test("a missing input says how to supply it", () => {
    expect(() => Container.create({ providers: [...shop] })).toThrow(
      "Input `baseUrl` was not supplied",
    );
  });

  test("a cycle", () => {
    const B = token<object>("B");
    @Injectable([B])
    class A {
      constructor(readonly b: object) {}
    }
    @Injectable([A])
    @Provides(B)
    class BImpl {
      constructor(readonly a: A) {}
    }

    expect(() => Container.create({ providers: [A, BImpl] })).toThrow(
      "Circular dependency: A → BImpl → A",
    );
  });

  test("two providers for one token", () => {
    @Injectable([])
    @Provides(Clock)
    class One implements Clock {
      now = () => 1;
    }
    @Injectable([])
    @Provides(Clock)
    class Two implements Clock {
      now = () => 2;
    }

    expect(() => Container.create({ providers: [One, Two] })).toThrow(
      "has several providers (One, Two)",
    );
  });

  test("a class without @Injectable is rejected with the fix", () => {
    class Plain {}

    expect(() => Container.create({ providers: [Plain] })).toThrow(DiError);
    expect(() => Container.create({ providers: [Plain] })).toThrow("has no @Injectable([...])");
  });

  test("a class in modules that is not a @Module", () => {
    class NotAModule {}

    expect(() => Container.create({ modules: [NotAModule] })).toThrow("not decorated with @Module");
  });

  test("inner() outside a decorator", () => {
    @Injectable([inner(Clock)])
    class Lost {
      constructor(readonly clock: Clock) {}
    }

    expect(() => Container.create({ providers: [Lost] })).toThrow("only works in a class marked");
  });

  test("validate() builds nothing", () => {
    let built = 0;
    @Injectable([])
    class Counted {
      constructor() {
        built += 1;
      }
    }

    Container.create({ providers: [Counted] }).validate();

    expect(built).toBe(0);
  });
});

describe("the dependency list is type-checked against the constructor (tsc proves these)", () => {
  test("a wrong order, a wrong type and an extra parameter do not compile", () => {
    // @ts-expect-error constructor wants (Clock, string) but deps say (string, Clock)
    @Injectable([BaseUrl, Clock])
    class Swapped {
      constructor(
        readonly clock: Clock,
        readonly url: string,
      ) {}
    }

    // @ts-expect-error constructor takes a number, BaseUrl is a string
    @Injectable([BaseUrl])
    class WrongType {
      constructor(readonly n: number) {}
    }

    // @ts-expect-error constructor has a second required parameter that deps do not supply
    @Injectable([Clock])
    class TooMany {
      constructor(
        readonly clock: Clock,
        readonly url: string,
      ) {}
    }

    expect([Swapped, WrongType, TooMany]).toHaveLength(3);
  });

  test("get() is typed by the token", () => {
    const container = Container.create({
      providers: [FixedClock, bind(Clock).toClass(FixedClock)],
    });

    const now: number = container.get(Clock).now();
    // @ts-expect-error a Clock is not a string
    const wrong: string = container.get(Clock);

    expect([now, wrong]).toBeDefined();
  });
});
