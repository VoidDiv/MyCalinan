import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise, DataConnectSettings } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;
export const dataConnectSettings: DataConnectSettings;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface CreateProjectData {
  project_insert: Project_Key;
}

export interface CreateTagData {
  tag_insert: Tag_Key;
}

export interface CreateTaskData {
  task_insert: Task_Key;
}

export interface CreateTaskTagData {
  taskTag_insert: TaskTag_Key;
}

export interface CreateUserDataData {
  user_upsert: User_Key;
}

export interface DeleteProjectData {
  project_delete?: Project_Key | null;
}

export interface DeleteTagData {
  tag_delete?: Tag_Key | null;
}

export interface DeleteTaskData {
  task_delete?: Task_Key | null;
}

export interface DeleteTaskTagData {
  taskTag_delete?: TaskTag_Key | null;
}

export interface DeleteUserData {
  user_delete?: User_Key | null;
}

export interface GetProjectData {
  project?: {
    title: string;
    description?: string | null;
  };
}

export interface GetTagData {
  tag?: {
    name: string;
    color?: string | null;
  };
}

export interface GetTaskData {
  task?: {
    title: string;
    status: string;
  };
}

export interface GetUserDataData {
  user?: {
    id: UUIDString;
    email: string;
    displayName: string;
  } & User_Key;
}

export interface ListProjectsData {
  projects: ({
    id: UUIDString;
    title: string;
  } & Project_Key)[];
}

export interface ListTagsData {
  tags: ({
    id: UUIDString;
    name: string;
  } & Tag_Key)[];
}

export interface ListTasksData {
  tasks: ({
    id: UUIDString;
    title: string;
    status: string;
  } & Task_Key)[];
}

export interface Project_Key {
  id: UUIDString;
  __typename?: 'Project_Key';
}

export interface Tag_Key {
  id: UUIDString;
  __typename?: 'Tag_Key';
}

export interface TaskTag_Key {
  taskId: UUIDString;
  tagId: UUIDString;
  __typename?: 'TaskTag_Key';
}

export interface Task_Key {
  id: UUIDString;
  __typename?: 'Task_Key';
}

export interface UpdateProjectData {
  project_update?: Project_Key | null;
}

export interface UpdateTagData {
  tag_update?: Tag_Key | null;
}

export interface UpdateTaskData {
  task_update?: Task_Key | null;
}

export interface UpdateTaskTagData {
  taskTag_update?: TaskTag_Key | null;
}

export interface UpdateUserData {
  user_update?: User_Key | null;
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface CreateUserDataRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateUserDataData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<CreateUserDataData, undefined>;
  operationName: string;
}
export const createUserDataRef: CreateUserDataRef;

export function createUserData(): MutationPromise<CreateUserDataData, undefined>;
export function createUserData(dc: DataConnect): MutationPromise<CreateUserDataData, undefined>;

interface CreateProjectRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateProjectData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<CreateProjectData, undefined>;
  operationName: string;
}
export const createProjectRef: CreateProjectRef;

export function createProject(): MutationPromise<CreateProjectData, undefined>;
export function createProject(dc: DataConnect): MutationPromise<CreateProjectData, undefined>;

interface CreateTaskRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateTaskData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<CreateTaskData, undefined>;
  operationName: string;
}
export const createTaskRef: CreateTaskRef;

export function createTask(): MutationPromise<CreateTaskData, undefined>;
export function createTask(dc: DataConnect): MutationPromise<CreateTaskData, undefined>;

interface CreateTagRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateTagData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<CreateTagData, undefined>;
  operationName: string;
}
export const createTagRef: CreateTagRef;

export function createTag(): MutationPromise<CreateTagData, undefined>;
export function createTag(dc: DataConnect): MutationPromise<CreateTagData, undefined>;

interface CreateTaskTagRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateTaskTagData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<CreateTaskTagData, undefined>;
  operationName: string;
}
export const createTaskTagRef: CreateTaskTagRef;

export function createTaskTag(): MutationPromise<CreateTaskTagData, undefined>;
export function createTaskTag(dc: DataConnect): MutationPromise<CreateTaskTagData, undefined>;

interface UpdateUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<UpdateUserData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<UpdateUserData, undefined>;
  operationName: string;
}
export const updateUserRef: UpdateUserRef;

export function updateUser(): MutationPromise<UpdateUserData, undefined>;
export function updateUser(dc: DataConnect): MutationPromise<UpdateUserData, undefined>;

interface UpdateProjectRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<UpdateProjectData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<UpdateProjectData, undefined>;
  operationName: string;
}
export const updateProjectRef: UpdateProjectRef;

export function updateProject(): MutationPromise<UpdateProjectData, undefined>;
export function updateProject(dc: DataConnect): MutationPromise<UpdateProjectData, undefined>;

interface UpdateTaskRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<UpdateTaskData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<UpdateTaskData, undefined>;
  operationName: string;
}
export const updateTaskRef: UpdateTaskRef;

export function updateTask(): MutationPromise<UpdateTaskData, undefined>;
export function updateTask(dc: DataConnect): MutationPromise<UpdateTaskData, undefined>;

interface UpdateTagRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<UpdateTagData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<UpdateTagData, undefined>;
  operationName: string;
}
export const updateTagRef: UpdateTagRef;

export function updateTag(): MutationPromise<UpdateTagData, undefined>;
export function updateTag(dc: DataConnect): MutationPromise<UpdateTagData, undefined>;

interface UpdateTaskTagRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<UpdateTaskTagData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<UpdateTaskTagData, undefined>;
  operationName: string;
}
export const updateTaskTagRef: UpdateTaskTagRef;

export function updateTaskTag(): MutationPromise<UpdateTaskTagData, undefined>;
export function updateTaskTag(dc: DataConnect): MutationPromise<UpdateTaskTagData, undefined>;

interface DeleteUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<DeleteUserData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<DeleteUserData, undefined>;
  operationName: string;
}
export const deleteUserRef: DeleteUserRef;

export function deleteUser(): MutationPromise<DeleteUserData, undefined>;
export function deleteUser(dc: DataConnect): MutationPromise<DeleteUserData, undefined>;

interface DeleteProjectRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<DeleteProjectData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<DeleteProjectData, undefined>;
  operationName: string;
}
export const deleteProjectRef: DeleteProjectRef;

export function deleteProject(): MutationPromise<DeleteProjectData, undefined>;
export function deleteProject(dc: DataConnect): MutationPromise<DeleteProjectData, undefined>;

interface DeleteTaskRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<DeleteTaskData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<DeleteTaskData, undefined>;
  operationName: string;
}
export const deleteTaskRef: DeleteTaskRef;

export function deleteTask(): MutationPromise<DeleteTaskData, undefined>;
export function deleteTask(dc: DataConnect): MutationPromise<DeleteTaskData, undefined>;

interface DeleteTagRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<DeleteTagData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<DeleteTagData, undefined>;
  operationName: string;
}
export const deleteTagRef: DeleteTagRef;

export function deleteTag(): MutationPromise<DeleteTagData, undefined>;
export function deleteTag(dc: DataConnect): MutationPromise<DeleteTagData, undefined>;

interface DeleteTaskTagRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<DeleteTaskTagData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<DeleteTaskTagData, undefined>;
  operationName: string;
}
export const deleteTaskTagRef: DeleteTaskTagRef;

export function deleteTaskTag(): MutationPromise<DeleteTaskTagData, undefined>;
export function deleteTaskTag(dc: DataConnect): MutationPromise<DeleteTaskTagData, undefined>;

interface GetUserDataRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetUserDataData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetUserDataData, undefined>;
  operationName: string;
}
export const getUserDataRef: GetUserDataRef;

export function getUserData(options?: ExecuteQueryOptions): QueryPromise<GetUserDataData, undefined>;
export function getUserData(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetUserDataData, undefined>;

interface GetProjectRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetProjectData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetProjectData, undefined>;
  operationName: string;
}
export const getProjectRef: GetProjectRef;

export function getProject(options?: ExecuteQueryOptions): QueryPromise<GetProjectData, undefined>;
export function getProject(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetProjectData, undefined>;

interface GetTaskRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetTaskData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetTaskData, undefined>;
  operationName: string;
}
export const getTaskRef: GetTaskRef;

export function getTask(options?: ExecuteQueryOptions): QueryPromise<GetTaskData, undefined>;
export function getTask(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetTaskData, undefined>;

interface GetTagRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetTagData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetTagData, undefined>;
  operationName: string;
}
export const getTagRef: GetTagRef;

export function getTag(options?: ExecuteQueryOptions): QueryPromise<GetTagData, undefined>;
export function getTag(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetTagData, undefined>;

interface ListProjectsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListProjectsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListProjectsData, undefined>;
  operationName: string;
}
export const listProjectsRef: ListProjectsRef;

export function listProjects(options?: ExecuteQueryOptions): QueryPromise<ListProjectsData, undefined>;
export function listProjects(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListProjectsData, undefined>;

interface ListTasksRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListTasksData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListTasksData, undefined>;
  operationName: string;
}
export const listTasksRef: ListTasksRef;

export function listTasks(options?: ExecuteQueryOptions): QueryPromise<ListTasksData, undefined>;
export function listTasks(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListTasksData, undefined>;

interface ListTagsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListTagsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListTagsData, undefined>;
  operationName: string;
}
export const listTagsRef: ListTagsRef;

export function listTags(options?: ExecuteQueryOptions): QueryPromise<ListTagsData, undefined>;
export function listTags(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListTagsData, undefined>;

