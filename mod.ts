import { E, flow, pipe, TE } from "./deps.ts";

export type EnvVarTuple = readonly [string, string];

export type TaskDefinition = {
  readonly containerDefinitions?: ReadonlyArray<{
    environments?: ReadonlyArray<
      { readonly name: string; readonly value: string }
    >;
  }>;
};

export function modify(path: string) {
  return (envVars: ReadonlyArray<EnvVarTuple>) =>
    pipe(
      path,
      read,
      TE.chain(flow(addEnvVars(envVars), TE.fromEither)),
      TE.chain(write(path)),
    );
}

function addEnvVars(envVars: ReadonlyArray<EnvVarTuple>) {
  return (taskDefinition: TaskDefinition): E.Either<Error, TaskDefinition> =>
    E.right({
      ...taskDefinition,
      containerDefinitions: taskDefinition.containerDefinitions
        ? taskDefinition.containerDefinitions.map((cd) => ({
          ...cd,
          environments: [
            ...(cd.environments || []).filter(({name}) => !envVars.find(([n, _]) => name === n)),
            ...envVars.map(([name, value]) => ({ name, value })),
          ],
        }))
        : [],
    });
}

function read(
  path: string,
): TE.TaskEither<Error, TaskDefinition> {
  return pipe(
    () => Deno.readTextFile(path),
    TE.fromFailableTask((err) => err as unknown as Error),
    TE.chain(flow(parse, TE.fromEither)),
  );
}

function write(
  path: string,
): (taskDefinition: TaskDefinition) => TE.TaskEither<Error, void> {
  return flow(
    stringify,
    TE.fromEither,
    TE.chain((s) =>
      pipe(
        () => Deno.writeTextFile(path, s),
        TE.fromFailableTask((err) => err as unknown as Error),
      )
    ),
  );
}

function parse(str: string): E.Either<Error, TaskDefinition> {
  return E.tryCatch(
    () => JSON.parse(str) as TaskDefinition,
    (err) => err as unknown as Error,
  );
}

function stringify(taskDefinition: TaskDefinition): E.Either<Error, string> {
  return E.tryCatch(
    () => JSON.stringify(taskDefinition, null, 2),
    (err) => err as unknown as Error,
  );
}
