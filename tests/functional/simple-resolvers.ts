import "reflect-metadata";
import gql from "graphql-tag";
import { GraphQLSchema, execute } from "graphql";
import { MiddlewareFn, ObjectType, Field, buildSchema, Resolver, Query } from "../../src";

import { getMetadataStorage } from "../../src/metadata/getMetadataStorage";

describe("Simple resolvers", () => {
  let schema: GraphQLSchema;
  let middlewareLogs: string[] = [];

  beforeAll(async () => {
    getMetadataStorage().clear();

    const testMiddleware: MiddlewareFn = async ({}, next) => {
      middlewareLogs.push("middleware extecuted");
      return next();
    };

    @ObjectType()
    class NormalObject {
      @Field()
      normalField: string;
    }
    @ObjectType()
    class ObjectWithSimpleField {
      @Field({ simple: true })
      simpleField: string;
    }
    @ObjectType({ simpleResolvers: true })
    class SimpleObject {
      @Field()
      simpleField: string;
    }
    @ObjectType({ simpleResolvers: true })
    class SimpleObjectWithNormalField {
      @Field({ simple: false })
      normalField: string;
    }

    @Resolver()
    class TestResolver {
      @Query()
      normalObjectQuery(): NormalObject {
        return { normalField: "normalField" };
      }

      @Query()
      objectWithSimpleFieldQuery(): ObjectWithSimpleField {
        return { simpleField: "simpleField" };
      }

      @Query()
      simpleObjectQuery(): SimpleObject {
        return { simpleField: "simpleField" };
      }

      @Query()
      simpleObjectWithNormalFieldQuery(): SimpleObjectWithNormalField {
        return { normalField: "normalField" };
      }
    }

    schema = await buildSchema({
      resolvers: [TestResolver],
      globalMiddlewares: [testMiddleware],
    });
  });

  beforeEach(() => {
    middlewareLogs = [];
  });

  it("should execute middlewares for field resolvers for normal object", async () => {
    const document = gql`
      query {
        normalObjectQuery {
          normalField
        }
      }
    `;

    await execute({ schema, document });

    expect(middlewareLogs).toHaveLength(2);
  });

  it("shouldn't execute middlewares for simple field resolvers", async () => {
    const document = gql`
      query {
        objectWithSimpleFieldQuery {
          simpleField
        }
      }
    `;

    await execute({ schema, document });

    expect(middlewareLogs).toHaveLength(1);
  });

  it("shouldn't execute middlewares for field resolvers of simple objects", async () => {
    const document = gql`
      query {
        simpleObjectQuery {
          simpleField
        }
      }
    `;

    await execute({ schema, document });

    expect(middlewareLogs).toHaveLength(1);
  });

  it("should execute middlewares for not simple field resolvers of simple objects", async () => {
    const document = gql`
      query {
        simpleObjectWithNormalFieldQuery {
          normalField
        }
      }
    `;

    await execute({ schema, document });

    expect(middlewareLogs).toHaveLength(2);
  });
});
