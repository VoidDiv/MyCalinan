# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useCreateUserData, useCreateProject, useCreateTask, useCreateTag, useCreateTaskTag, useUpdateUser, useUpdateProject, useUpdateTask, useUpdateTag, useUpdateTaskTag } from '@dataconnect/generated/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useCreateUserData();

const { data, isPending, isSuccess, isError, error } = useCreateProject();

const { data, isPending, isSuccess, isError, error } = useCreateTask();

const { data, isPending, isSuccess, isError, error } = useCreateTag();

const { data, isPending, isSuccess, isError, error } = useCreateTaskTag();

const { data, isPending, isSuccess, isError, error } = useUpdateUser();

const { data, isPending, isSuccess, isError, error } = useUpdateProject();

const { data, isPending, isSuccess, isError, error } = useUpdateTask();

const { data, isPending, isSuccess, isError, error } = useUpdateTag();

const { data, isPending, isSuccess, isError, error } = useUpdateTaskTag();

```

Here's an example from a different generated SDK:

```ts
import { useListAllMovies } from '@dataconnect/generated/react';

function MyComponent() {
  const { isLoading, data, error } = useListAllMovies();
  if(isLoading) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div> An Error Occurred: {error} </div>
  }
}

// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from './my-component';

function App() {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
}
```



## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createUserData, createProject, createTask, createTag, createTaskTag, updateUser, updateProject, updateTask, updateTag, updateTaskTag } from '@dataconnect/generated';


// Operation CreateUserData: 
const { data } = await CreateUserData(dataConnect);

// Operation CreateProject: 
const { data } = await CreateProject(dataConnect);

// Operation CreateTask: 
const { data } = await CreateTask(dataConnect);

// Operation CreateTag: 
const { data } = await CreateTag(dataConnect);

// Operation CreateTaskTag: 
const { data } = await CreateTaskTag(dataConnect);

// Operation UpdateUser: 
const { data } = await UpdateUser(dataConnect);

// Operation UpdateProject: 
const { data } = await UpdateProject(dataConnect);

// Operation UpdateTask: 
const { data } = await UpdateTask(dataConnect);

// Operation UpdateTag: 
const { data } = await UpdateTag(dataConnect);

// Operation UpdateTaskTag: 
const { data } = await UpdateTaskTag(dataConnect);


```