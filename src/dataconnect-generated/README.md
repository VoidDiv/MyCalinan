# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetUserData*](#getuserdata)
  - [*GetProject*](#getproject)
  - [*GetTask*](#gettask)
  - [*GetTag*](#gettag)
  - [*ListProjects*](#listprojects)
  - [*ListTasks*](#listtasks)
  - [*ListTags*](#listtags)
- [**Mutations**](#mutations)
  - [*CreateUserData*](#createuserdata)
  - [*CreateProject*](#createproject)
  - [*CreateTask*](#createtask)
  - [*CreateTag*](#createtag)
  - [*CreateTaskTag*](#createtasktag)
  - [*UpdateUser*](#updateuser)
  - [*UpdateProject*](#updateproject)
  - [*UpdateTask*](#updatetask)
  - [*UpdateTag*](#updatetag)
  - [*UpdateTaskTag*](#updatetasktag)
  - [*DeleteUser*](#deleteuser)
  - [*DeleteProject*](#deleteproject)
  - [*DeleteTask*](#deletetask)
  - [*DeleteTag*](#deletetag)
  - [*DeleteTaskTag*](#deletetasktag)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetUserData
You can execute the `GetUserData` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getUserData(options?: ExecuteQueryOptions): QueryPromise<GetUserDataData, undefined>;

interface GetUserDataRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetUserDataData, undefined>;
}
export const getUserDataRef: GetUserDataRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUserData(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetUserDataData, undefined>;

interface GetUserDataRef {
  ...
  (dc: DataConnect): QueryRef<GetUserDataData, undefined>;
}
export const getUserDataRef: GetUserDataRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserDataRef:
```typescript
const name = getUserDataRef.operationName;
console.log(name);
```

### Variables
The `GetUserData` query has no variables.
### Return Type
Recall that executing the `GetUserData` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserDataData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetUserDataData {
  user?: {
    id: UUIDString;
    email: string;
    displayName: string;
  } & User_Key;
}
```
### Using `GetUserData`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserData } from '@dataconnect/generated';


// Call the `getUserData()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserData();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserData(dataConnect);

console.log(data.user);

// Or, you can use the `Promise` API.
getUserData().then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

### Using `GetUserData`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserDataRef } from '@dataconnect/generated';


// Call the `getUserDataRef()` function to get a reference to the query.
const ref = getUserDataRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserDataRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.user);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

## GetProject
You can execute the `GetProject` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getProject(options?: ExecuteQueryOptions): QueryPromise<GetProjectData, undefined>;

interface GetProjectRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetProjectData, undefined>;
}
export const getProjectRef: GetProjectRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getProject(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetProjectData, undefined>;

interface GetProjectRef {
  ...
  (dc: DataConnect): QueryRef<GetProjectData, undefined>;
}
export const getProjectRef: GetProjectRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getProjectRef:
```typescript
const name = getProjectRef.operationName;
console.log(name);
```

### Variables
The `GetProject` query has no variables.
### Return Type
Recall that executing the `GetProject` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetProjectData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetProjectData {
  project?: {
    title: string;
    description?: string | null;
  };
}
```
### Using `GetProject`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getProject } from '@dataconnect/generated';


// Call the `getProject()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getProject();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getProject(dataConnect);

console.log(data.project);

// Or, you can use the `Promise` API.
getProject().then((response) => {
  const data = response.data;
  console.log(data.project);
});
```

### Using `GetProject`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getProjectRef } from '@dataconnect/generated';


// Call the `getProjectRef()` function to get a reference to the query.
const ref = getProjectRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getProjectRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.project);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.project);
});
```

## GetTask
You can execute the `GetTask` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getTask(options?: ExecuteQueryOptions): QueryPromise<GetTaskData, undefined>;

interface GetTaskRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetTaskData, undefined>;
}
export const getTaskRef: GetTaskRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getTask(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetTaskData, undefined>;

interface GetTaskRef {
  ...
  (dc: DataConnect): QueryRef<GetTaskData, undefined>;
}
export const getTaskRef: GetTaskRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getTaskRef:
```typescript
const name = getTaskRef.operationName;
console.log(name);
```

### Variables
The `GetTask` query has no variables.
### Return Type
Recall that executing the `GetTask` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetTaskData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetTaskData {
  task?: {
    title: string;
    status: string;
  };
}
```
### Using `GetTask`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getTask } from '@dataconnect/generated';


// Call the `getTask()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getTask();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getTask(dataConnect);

console.log(data.task);

// Or, you can use the `Promise` API.
getTask().then((response) => {
  const data = response.data;
  console.log(data.task);
});
```

### Using `GetTask`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getTaskRef } from '@dataconnect/generated';


// Call the `getTaskRef()` function to get a reference to the query.
const ref = getTaskRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getTaskRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.task);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.task);
});
```

## GetTag
You can execute the `GetTag` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getTag(options?: ExecuteQueryOptions): QueryPromise<GetTagData, undefined>;

interface GetTagRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetTagData, undefined>;
}
export const getTagRef: GetTagRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getTag(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetTagData, undefined>;

interface GetTagRef {
  ...
  (dc: DataConnect): QueryRef<GetTagData, undefined>;
}
export const getTagRef: GetTagRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getTagRef:
```typescript
const name = getTagRef.operationName;
console.log(name);
```

### Variables
The `GetTag` query has no variables.
### Return Type
Recall that executing the `GetTag` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetTagData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetTagData {
  tag?: {
    name: string;
    color?: string | null;
  };
}
```
### Using `GetTag`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getTag } from '@dataconnect/generated';


// Call the `getTag()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getTag();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getTag(dataConnect);

console.log(data.tag);

// Or, you can use the `Promise` API.
getTag().then((response) => {
  const data = response.data;
  console.log(data.tag);
});
```

### Using `GetTag`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getTagRef } from '@dataconnect/generated';


// Call the `getTagRef()` function to get a reference to the query.
const ref = getTagRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getTagRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.tag);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.tag);
});
```

## ListProjects
You can execute the `ListProjects` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listProjects(options?: ExecuteQueryOptions): QueryPromise<ListProjectsData, undefined>;

interface ListProjectsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListProjectsData, undefined>;
}
export const listProjectsRef: ListProjectsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listProjects(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListProjectsData, undefined>;

interface ListProjectsRef {
  ...
  (dc: DataConnect): QueryRef<ListProjectsData, undefined>;
}
export const listProjectsRef: ListProjectsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listProjectsRef:
```typescript
const name = listProjectsRef.operationName;
console.log(name);
```

### Variables
The `ListProjects` query has no variables.
### Return Type
Recall that executing the `ListProjects` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListProjectsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListProjectsData {
  projects: ({
    id: UUIDString;
    title: string;
  } & Project_Key)[];
}
```
### Using `ListProjects`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listProjects } from '@dataconnect/generated';


// Call the `listProjects()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listProjects();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listProjects(dataConnect);

console.log(data.projects);

// Or, you can use the `Promise` API.
listProjects().then((response) => {
  const data = response.data;
  console.log(data.projects);
});
```

### Using `ListProjects`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listProjectsRef } from '@dataconnect/generated';


// Call the `listProjectsRef()` function to get a reference to the query.
const ref = listProjectsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listProjectsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.projects);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.projects);
});
```

## ListTasks
You can execute the `ListTasks` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listTasks(options?: ExecuteQueryOptions): QueryPromise<ListTasksData, undefined>;

interface ListTasksRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListTasksData, undefined>;
}
export const listTasksRef: ListTasksRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listTasks(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListTasksData, undefined>;

interface ListTasksRef {
  ...
  (dc: DataConnect): QueryRef<ListTasksData, undefined>;
}
export const listTasksRef: ListTasksRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listTasksRef:
```typescript
const name = listTasksRef.operationName;
console.log(name);
```

### Variables
The `ListTasks` query has no variables.
### Return Type
Recall that executing the `ListTasks` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListTasksData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListTasksData {
  tasks: ({
    id: UUIDString;
    title: string;
    status: string;
  } & Task_Key)[];
}
```
### Using `ListTasks`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listTasks } from '@dataconnect/generated';


// Call the `listTasks()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listTasks();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listTasks(dataConnect);

console.log(data.tasks);

// Or, you can use the `Promise` API.
listTasks().then((response) => {
  const data = response.data;
  console.log(data.tasks);
});
```

### Using `ListTasks`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listTasksRef } from '@dataconnect/generated';


// Call the `listTasksRef()` function to get a reference to the query.
const ref = listTasksRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listTasksRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.tasks);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.tasks);
});
```

## ListTags
You can execute the `ListTags` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listTags(options?: ExecuteQueryOptions): QueryPromise<ListTagsData, undefined>;

interface ListTagsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListTagsData, undefined>;
}
export const listTagsRef: ListTagsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listTags(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListTagsData, undefined>;

interface ListTagsRef {
  ...
  (dc: DataConnect): QueryRef<ListTagsData, undefined>;
}
export const listTagsRef: ListTagsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listTagsRef:
```typescript
const name = listTagsRef.operationName;
console.log(name);
```

### Variables
The `ListTags` query has no variables.
### Return Type
Recall that executing the `ListTags` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListTagsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListTagsData {
  tags: ({
    id: UUIDString;
    name: string;
  } & Tag_Key)[];
}
```
### Using `ListTags`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listTags } from '@dataconnect/generated';


// Call the `listTags()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listTags();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listTags(dataConnect);

console.log(data.tags);

// Or, you can use the `Promise` API.
listTags().then((response) => {
  const data = response.data;
  console.log(data.tags);
});
```

### Using `ListTags`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listTagsRef } from '@dataconnect/generated';


// Call the `listTagsRef()` function to get a reference to the query.
const ref = listTagsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listTagsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.tags);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.tags);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateUserData
You can execute the `CreateUserData` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createUserData(): MutationPromise<CreateUserDataData, undefined>;

interface CreateUserDataRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateUserDataData, undefined>;
}
export const createUserDataRef: CreateUserDataRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createUserData(dc: DataConnect): MutationPromise<CreateUserDataData, undefined>;

interface CreateUserDataRef {
  ...
  (dc: DataConnect): MutationRef<CreateUserDataData, undefined>;
}
export const createUserDataRef: CreateUserDataRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createUserDataRef:
```typescript
const name = createUserDataRef.operationName;
console.log(name);
```

### Variables
The `CreateUserData` mutation has no variables.
### Return Type
Recall that executing the `CreateUserData` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateUserDataData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateUserDataData {
  user_upsert: User_Key;
}
```
### Using `CreateUserData`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createUserData } from '@dataconnect/generated';


// Call the `createUserData()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createUserData();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createUserData(dataConnect);

console.log(data.user_upsert);

// Or, you can use the `Promise` API.
createUserData().then((response) => {
  const data = response.data;
  console.log(data.user_upsert);
});
```

### Using `CreateUserData`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createUserDataRef } from '@dataconnect/generated';


// Call the `createUserDataRef()` function to get a reference to the mutation.
const ref = createUserDataRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createUserDataRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_upsert);
});
```

## CreateProject
You can execute the `CreateProject` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createProject(): MutationPromise<CreateProjectData, undefined>;

interface CreateProjectRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateProjectData, undefined>;
}
export const createProjectRef: CreateProjectRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createProject(dc: DataConnect): MutationPromise<CreateProjectData, undefined>;

interface CreateProjectRef {
  ...
  (dc: DataConnect): MutationRef<CreateProjectData, undefined>;
}
export const createProjectRef: CreateProjectRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createProjectRef:
```typescript
const name = createProjectRef.operationName;
console.log(name);
```

### Variables
The `CreateProject` mutation has no variables.
### Return Type
Recall that executing the `CreateProject` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateProjectData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateProjectData {
  project_insert: Project_Key;
}
```
### Using `CreateProject`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createProject } from '@dataconnect/generated';


// Call the `createProject()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createProject();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createProject(dataConnect);

console.log(data.project_insert);

// Or, you can use the `Promise` API.
createProject().then((response) => {
  const data = response.data;
  console.log(data.project_insert);
});
```

### Using `CreateProject`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createProjectRef } from '@dataconnect/generated';


// Call the `createProjectRef()` function to get a reference to the mutation.
const ref = createProjectRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createProjectRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.project_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.project_insert);
});
```

## CreateTask
You can execute the `CreateTask` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createTask(): MutationPromise<CreateTaskData, undefined>;

interface CreateTaskRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateTaskData, undefined>;
}
export const createTaskRef: CreateTaskRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createTask(dc: DataConnect): MutationPromise<CreateTaskData, undefined>;

interface CreateTaskRef {
  ...
  (dc: DataConnect): MutationRef<CreateTaskData, undefined>;
}
export const createTaskRef: CreateTaskRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createTaskRef:
```typescript
const name = createTaskRef.operationName;
console.log(name);
```

### Variables
The `CreateTask` mutation has no variables.
### Return Type
Recall that executing the `CreateTask` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateTaskData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateTaskData {
  task_insert: Task_Key;
}
```
### Using `CreateTask`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createTask } from '@dataconnect/generated';


// Call the `createTask()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createTask();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createTask(dataConnect);

console.log(data.task_insert);

// Or, you can use the `Promise` API.
createTask().then((response) => {
  const data = response.data;
  console.log(data.task_insert);
});
```

### Using `CreateTask`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createTaskRef } from '@dataconnect/generated';


// Call the `createTaskRef()` function to get a reference to the mutation.
const ref = createTaskRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createTaskRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.task_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.task_insert);
});
```

## CreateTag
You can execute the `CreateTag` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createTag(): MutationPromise<CreateTagData, undefined>;

interface CreateTagRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateTagData, undefined>;
}
export const createTagRef: CreateTagRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createTag(dc: DataConnect): MutationPromise<CreateTagData, undefined>;

interface CreateTagRef {
  ...
  (dc: DataConnect): MutationRef<CreateTagData, undefined>;
}
export const createTagRef: CreateTagRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createTagRef:
```typescript
const name = createTagRef.operationName;
console.log(name);
```

### Variables
The `CreateTag` mutation has no variables.
### Return Type
Recall that executing the `CreateTag` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateTagData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateTagData {
  tag_insert: Tag_Key;
}
```
### Using `CreateTag`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createTag } from '@dataconnect/generated';


// Call the `createTag()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createTag();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createTag(dataConnect);

console.log(data.tag_insert);

// Or, you can use the `Promise` API.
createTag().then((response) => {
  const data = response.data;
  console.log(data.tag_insert);
});
```

### Using `CreateTag`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createTagRef } from '@dataconnect/generated';


// Call the `createTagRef()` function to get a reference to the mutation.
const ref = createTagRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createTagRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.tag_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.tag_insert);
});
```

## CreateTaskTag
You can execute the `CreateTaskTag` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createTaskTag(): MutationPromise<CreateTaskTagData, undefined>;

interface CreateTaskTagRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateTaskTagData, undefined>;
}
export const createTaskTagRef: CreateTaskTagRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createTaskTag(dc: DataConnect): MutationPromise<CreateTaskTagData, undefined>;

interface CreateTaskTagRef {
  ...
  (dc: DataConnect): MutationRef<CreateTaskTagData, undefined>;
}
export const createTaskTagRef: CreateTaskTagRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createTaskTagRef:
```typescript
const name = createTaskTagRef.operationName;
console.log(name);
```

### Variables
The `CreateTaskTag` mutation has no variables.
### Return Type
Recall that executing the `CreateTaskTag` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateTaskTagData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateTaskTagData {
  taskTag_insert: TaskTag_Key;
}
```
### Using `CreateTaskTag`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createTaskTag } from '@dataconnect/generated';


// Call the `createTaskTag()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createTaskTag();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createTaskTag(dataConnect);

console.log(data.taskTag_insert);

// Or, you can use the `Promise` API.
createTaskTag().then((response) => {
  const data = response.data;
  console.log(data.taskTag_insert);
});
```

### Using `CreateTaskTag`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createTaskTagRef } from '@dataconnect/generated';


// Call the `createTaskTagRef()` function to get a reference to the mutation.
const ref = createTaskTagRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createTaskTagRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.taskTag_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.taskTag_insert);
});
```

## UpdateUser
You can execute the `UpdateUser` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateUser(): MutationPromise<UpdateUserData, undefined>;

interface UpdateUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<UpdateUserData, undefined>;
}
export const updateUserRef: UpdateUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateUser(dc: DataConnect): MutationPromise<UpdateUserData, undefined>;

interface UpdateUserRef {
  ...
  (dc: DataConnect): MutationRef<UpdateUserData, undefined>;
}
export const updateUserRef: UpdateUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateUserRef:
```typescript
const name = updateUserRef.operationName;
console.log(name);
```

### Variables
The `UpdateUser` mutation has no variables.
### Return Type
Recall that executing the `UpdateUser` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateUserData {
  user_update?: User_Key | null;
}
```
### Using `UpdateUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateUser } from '@dataconnect/generated';


// Call the `updateUser()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateUser();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateUser(dataConnect);

console.log(data.user_update);

// Or, you can use the `Promise` API.
updateUser().then((response) => {
  const data = response.data;
  console.log(data.user_update);
});
```

### Using `UpdateUser`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateUserRef } from '@dataconnect/generated';


// Call the `updateUserRef()` function to get a reference to the mutation.
const ref = updateUserRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateUserRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_update);
});
```

## UpdateProject
You can execute the `UpdateProject` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateProject(): MutationPromise<UpdateProjectData, undefined>;

interface UpdateProjectRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<UpdateProjectData, undefined>;
}
export const updateProjectRef: UpdateProjectRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateProject(dc: DataConnect): MutationPromise<UpdateProjectData, undefined>;

interface UpdateProjectRef {
  ...
  (dc: DataConnect): MutationRef<UpdateProjectData, undefined>;
}
export const updateProjectRef: UpdateProjectRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateProjectRef:
```typescript
const name = updateProjectRef.operationName;
console.log(name);
```

### Variables
The `UpdateProject` mutation has no variables.
### Return Type
Recall that executing the `UpdateProject` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateProjectData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateProjectData {
  project_update?: Project_Key | null;
}
```
### Using `UpdateProject`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateProject } from '@dataconnect/generated';


// Call the `updateProject()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateProject();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateProject(dataConnect);

console.log(data.project_update);

// Or, you can use the `Promise` API.
updateProject().then((response) => {
  const data = response.data;
  console.log(data.project_update);
});
```

### Using `UpdateProject`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateProjectRef } from '@dataconnect/generated';


// Call the `updateProjectRef()` function to get a reference to the mutation.
const ref = updateProjectRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateProjectRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.project_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.project_update);
});
```

## UpdateTask
You can execute the `UpdateTask` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateTask(): MutationPromise<UpdateTaskData, undefined>;

interface UpdateTaskRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<UpdateTaskData, undefined>;
}
export const updateTaskRef: UpdateTaskRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateTask(dc: DataConnect): MutationPromise<UpdateTaskData, undefined>;

interface UpdateTaskRef {
  ...
  (dc: DataConnect): MutationRef<UpdateTaskData, undefined>;
}
export const updateTaskRef: UpdateTaskRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateTaskRef:
```typescript
const name = updateTaskRef.operationName;
console.log(name);
```

### Variables
The `UpdateTask` mutation has no variables.
### Return Type
Recall that executing the `UpdateTask` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateTaskData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateTaskData {
  task_update?: Task_Key | null;
}
```
### Using `UpdateTask`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateTask } from '@dataconnect/generated';


// Call the `updateTask()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateTask();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateTask(dataConnect);

console.log(data.task_update);

// Or, you can use the `Promise` API.
updateTask().then((response) => {
  const data = response.data;
  console.log(data.task_update);
});
```

### Using `UpdateTask`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateTaskRef } from '@dataconnect/generated';


// Call the `updateTaskRef()` function to get a reference to the mutation.
const ref = updateTaskRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateTaskRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.task_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.task_update);
});
```

## UpdateTag
You can execute the `UpdateTag` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateTag(): MutationPromise<UpdateTagData, undefined>;

interface UpdateTagRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<UpdateTagData, undefined>;
}
export const updateTagRef: UpdateTagRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateTag(dc: DataConnect): MutationPromise<UpdateTagData, undefined>;

interface UpdateTagRef {
  ...
  (dc: DataConnect): MutationRef<UpdateTagData, undefined>;
}
export const updateTagRef: UpdateTagRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateTagRef:
```typescript
const name = updateTagRef.operationName;
console.log(name);
```

### Variables
The `UpdateTag` mutation has no variables.
### Return Type
Recall that executing the `UpdateTag` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateTagData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateTagData {
  tag_update?: Tag_Key | null;
}
```
### Using `UpdateTag`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateTag } from '@dataconnect/generated';


// Call the `updateTag()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateTag();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateTag(dataConnect);

console.log(data.tag_update);

// Or, you can use the `Promise` API.
updateTag().then((response) => {
  const data = response.data;
  console.log(data.tag_update);
});
```

### Using `UpdateTag`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateTagRef } from '@dataconnect/generated';


// Call the `updateTagRef()` function to get a reference to the mutation.
const ref = updateTagRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateTagRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.tag_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.tag_update);
});
```

## UpdateTaskTag
You can execute the `UpdateTaskTag` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateTaskTag(): MutationPromise<UpdateTaskTagData, undefined>;

interface UpdateTaskTagRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<UpdateTaskTagData, undefined>;
}
export const updateTaskTagRef: UpdateTaskTagRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateTaskTag(dc: DataConnect): MutationPromise<UpdateTaskTagData, undefined>;

interface UpdateTaskTagRef {
  ...
  (dc: DataConnect): MutationRef<UpdateTaskTagData, undefined>;
}
export const updateTaskTagRef: UpdateTaskTagRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateTaskTagRef:
```typescript
const name = updateTaskTagRef.operationName;
console.log(name);
```

### Variables
The `UpdateTaskTag` mutation has no variables.
### Return Type
Recall that executing the `UpdateTaskTag` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateTaskTagData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateTaskTagData {
  taskTag_update?: TaskTag_Key | null;
}
```
### Using `UpdateTaskTag`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateTaskTag } from '@dataconnect/generated';


// Call the `updateTaskTag()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateTaskTag();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateTaskTag(dataConnect);

console.log(data.taskTag_update);

// Or, you can use the `Promise` API.
updateTaskTag().then((response) => {
  const data = response.data;
  console.log(data.taskTag_update);
});
```

### Using `UpdateTaskTag`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateTaskTagRef } from '@dataconnect/generated';


// Call the `updateTaskTagRef()` function to get a reference to the mutation.
const ref = updateTaskTagRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateTaskTagRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.taskTag_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.taskTag_update);
});
```

## DeleteUser
You can execute the `DeleteUser` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteUser(): MutationPromise<DeleteUserData, undefined>;

interface DeleteUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<DeleteUserData, undefined>;
}
export const deleteUserRef: DeleteUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteUser(dc: DataConnect): MutationPromise<DeleteUserData, undefined>;

interface DeleteUserRef {
  ...
  (dc: DataConnect): MutationRef<DeleteUserData, undefined>;
}
export const deleteUserRef: DeleteUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteUserRef:
```typescript
const name = deleteUserRef.operationName;
console.log(name);
```

### Variables
The `DeleteUser` mutation has no variables.
### Return Type
Recall that executing the `DeleteUser` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteUserData {
  user_delete?: User_Key | null;
}
```
### Using `DeleteUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteUser } from '@dataconnect/generated';


// Call the `deleteUser()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteUser();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteUser(dataConnect);

console.log(data.user_delete);

// Or, you can use the `Promise` API.
deleteUser().then((response) => {
  const data = response.data;
  console.log(data.user_delete);
});
```

### Using `DeleteUser`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteUserRef } from '@dataconnect/generated';


// Call the `deleteUserRef()` function to get a reference to the mutation.
const ref = deleteUserRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteUserRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_delete);
});
```

## DeleteProject
You can execute the `DeleteProject` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteProject(): MutationPromise<DeleteProjectData, undefined>;

interface DeleteProjectRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<DeleteProjectData, undefined>;
}
export const deleteProjectRef: DeleteProjectRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteProject(dc: DataConnect): MutationPromise<DeleteProjectData, undefined>;

interface DeleteProjectRef {
  ...
  (dc: DataConnect): MutationRef<DeleteProjectData, undefined>;
}
export const deleteProjectRef: DeleteProjectRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteProjectRef:
```typescript
const name = deleteProjectRef.operationName;
console.log(name);
```

### Variables
The `DeleteProject` mutation has no variables.
### Return Type
Recall that executing the `DeleteProject` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteProjectData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteProjectData {
  project_delete?: Project_Key | null;
}
```
### Using `DeleteProject`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteProject } from '@dataconnect/generated';


// Call the `deleteProject()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteProject();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteProject(dataConnect);

console.log(data.project_delete);

// Or, you can use the `Promise` API.
deleteProject().then((response) => {
  const data = response.data;
  console.log(data.project_delete);
});
```

### Using `DeleteProject`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteProjectRef } from '@dataconnect/generated';


// Call the `deleteProjectRef()` function to get a reference to the mutation.
const ref = deleteProjectRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteProjectRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.project_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.project_delete);
});
```

## DeleteTask
You can execute the `DeleteTask` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteTask(): MutationPromise<DeleteTaskData, undefined>;

interface DeleteTaskRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<DeleteTaskData, undefined>;
}
export const deleteTaskRef: DeleteTaskRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteTask(dc: DataConnect): MutationPromise<DeleteTaskData, undefined>;

interface DeleteTaskRef {
  ...
  (dc: DataConnect): MutationRef<DeleteTaskData, undefined>;
}
export const deleteTaskRef: DeleteTaskRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteTaskRef:
```typescript
const name = deleteTaskRef.operationName;
console.log(name);
```

### Variables
The `DeleteTask` mutation has no variables.
### Return Type
Recall that executing the `DeleteTask` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteTaskData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteTaskData {
  task_delete?: Task_Key | null;
}
```
### Using `DeleteTask`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteTask } from '@dataconnect/generated';


// Call the `deleteTask()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteTask();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteTask(dataConnect);

console.log(data.task_delete);

// Or, you can use the `Promise` API.
deleteTask().then((response) => {
  const data = response.data;
  console.log(data.task_delete);
});
```

### Using `DeleteTask`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteTaskRef } from '@dataconnect/generated';


// Call the `deleteTaskRef()` function to get a reference to the mutation.
const ref = deleteTaskRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteTaskRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.task_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.task_delete);
});
```

## DeleteTag
You can execute the `DeleteTag` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteTag(): MutationPromise<DeleteTagData, undefined>;

interface DeleteTagRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<DeleteTagData, undefined>;
}
export const deleteTagRef: DeleteTagRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteTag(dc: DataConnect): MutationPromise<DeleteTagData, undefined>;

interface DeleteTagRef {
  ...
  (dc: DataConnect): MutationRef<DeleteTagData, undefined>;
}
export const deleteTagRef: DeleteTagRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteTagRef:
```typescript
const name = deleteTagRef.operationName;
console.log(name);
```

### Variables
The `DeleteTag` mutation has no variables.
### Return Type
Recall that executing the `DeleteTag` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteTagData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteTagData {
  tag_delete?: Tag_Key | null;
}
```
### Using `DeleteTag`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteTag } from '@dataconnect/generated';


// Call the `deleteTag()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteTag();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteTag(dataConnect);

console.log(data.tag_delete);

// Or, you can use the `Promise` API.
deleteTag().then((response) => {
  const data = response.data;
  console.log(data.tag_delete);
});
```

### Using `DeleteTag`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteTagRef } from '@dataconnect/generated';


// Call the `deleteTagRef()` function to get a reference to the mutation.
const ref = deleteTagRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteTagRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.tag_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.tag_delete);
});
```

## DeleteTaskTag
You can execute the `DeleteTaskTag` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteTaskTag(): MutationPromise<DeleteTaskTagData, undefined>;

interface DeleteTaskTagRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<DeleteTaskTagData, undefined>;
}
export const deleteTaskTagRef: DeleteTaskTagRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteTaskTag(dc: DataConnect): MutationPromise<DeleteTaskTagData, undefined>;

interface DeleteTaskTagRef {
  ...
  (dc: DataConnect): MutationRef<DeleteTaskTagData, undefined>;
}
export const deleteTaskTagRef: DeleteTaskTagRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteTaskTagRef:
```typescript
const name = deleteTaskTagRef.operationName;
console.log(name);
```

### Variables
The `DeleteTaskTag` mutation has no variables.
### Return Type
Recall that executing the `DeleteTaskTag` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteTaskTagData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteTaskTagData {
  taskTag_delete?: TaskTag_Key | null;
}
```
### Using `DeleteTaskTag`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteTaskTag } from '@dataconnect/generated';


// Call the `deleteTaskTag()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteTaskTag();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteTaskTag(dataConnect);

console.log(data.taskTag_delete);

// Or, you can use the `Promise` API.
deleteTaskTag().then((response) => {
  const data = response.data;
  console.log(data.taskTag_delete);
});
```

### Using `DeleteTaskTag`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteTaskTagRef } from '@dataconnect/generated';


// Call the `deleteTaskTagRef()` function to get a reference to the mutation.
const ref = deleteTaskTagRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteTaskTagRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.taskTag_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.taskTag_delete);
});
```

