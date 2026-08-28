import { CreateUserDataData, CreateProjectData, CreateTaskData, CreateTagData, CreateTaskTagData, UpdateUserData, UpdateProjectData, UpdateTaskData, UpdateTagData, UpdateTaskTagData, DeleteUserData, DeleteProjectData, DeleteTaskData, DeleteTagData, DeleteTaskTagData, GetUserDataData, GetProjectData, GetTaskData, GetTagData, ListProjectsData, ListTasksData, ListTagsData } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateUserData(options?: useDataConnectMutationOptions<CreateUserDataData, FirebaseError, void>): UseDataConnectMutationResult<CreateUserDataData, undefined>;
export function useCreateUserData(dc: DataConnect, options?: useDataConnectMutationOptions<CreateUserDataData, FirebaseError, void>): UseDataConnectMutationResult<CreateUserDataData, undefined>;

export function useCreateProject(options?: useDataConnectMutationOptions<CreateProjectData, FirebaseError, void>): UseDataConnectMutationResult<CreateProjectData, undefined>;
export function useCreateProject(dc: DataConnect, options?: useDataConnectMutationOptions<CreateProjectData, FirebaseError, void>): UseDataConnectMutationResult<CreateProjectData, undefined>;

export function useCreateTask(options?: useDataConnectMutationOptions<CreateTaskData, FirebaseError, void>): UseDataConnectMutationResult<CreateTaskData, undefined>;
export function useCreateTask(dc: DataConnect, options?: useDataConnectMutationOptions<CreateTaskData, FirebaseError, void>): UseDataConnectMutationResult<CreateTaskData, undefined>;

export function useCreateTag(options?: useDataConnectMutationOptions<CreateTagData, FirebaseError, void>): UseDataConnectMutationResult<CreateTagData, undefined>;
export function useCreateTag(dc: DataConnect, options?: useDataConnectMutationOptions<CreateTagData, FirebaseError, void>): UseDataConnectMutationResult<CreateTagData, undefined>;

export function useCreateTaskTag(options?: useDataConnectMutationOptions<CreateTaskTagData, FirebaseError, void>): UseDataConnectMutationResult<CreateTaskTagData, undefined>;
export function useCreateTaskTag(dc: DataConnect, options?: useDataConnectMutationOptions<CreateTaskTagData, FirebaseError, void>): UseDataConnectMutationResult<CreateTaskTagData, undefined>;

export function useUpdateUser(options?: useDataConnectMutationOptions<UpdateUserData, FirebaseError, void>): UseDataConnectMutationResult<UpdateUserData, undefined>;
export function useUpdateUser(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateUserData, FirebaseError, void>): UseDataConnectMutationResult<UpdateUserData, undefined>;

export function useUpdateProject(options?: useDataConnectMutationOptions<UpdateProjectData, FirebaseError, void>): UseDataConnectMutationResult<UpdateProjectData, undefined>;
export function useUpdateProject(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateProjectData, FirebaseError, void>): UseDataConnectMutationResult<UpdateProjectData, undefined>;

export function useUpdateTask(options?: useDataConnectMutationOptions<UpdateTaskData, FirebaseError, void>): UseDataConnectMutationResult<UpdateTaskData, undefined>;
export function useUpdateTask(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateTaskData, FirebaseError, void>): UseDataConnectMutationResult<UpdateTaskData, undefined>;

export function useUpdateTag(options?: useDataConnectMutationOptions<UpdateTagData, FirebaseError, void>): UseDataConnectMutationResult<UpdateTagData, undefined>;
export function useUpdateTag(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateTagData, FirebaseError, void>): UseDataConnectMutationResult<UpdateTagData, undefined>;

export function useUpdateTaskTag(options?: useDataConnectMutationOptions<UpdateTaskTagData, FirebaseError, void>): UseDataConnectMutationResult<UpdateTaskTagData, undefined>;
export function useUpdateTaskTag(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateTaskTagData, FirebaseError, void>): UseDataConnectMutationResult<UpdateTaskTagData, undefined>;

export function useDeleteUser(options?: useDataConnectMutationOptions<DeleteUserData, FirebaseError, void>): UseDataConnectMutationResult<DeleteUserData, undefined>;
export function useDeleteUser(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteUserData, FirebaseError, void>): UseDataConnectMutationResult<DeleteUserData, undefined>;

export function useDeleteProject(options?: useDataConnectMutationOptions<DeleteProjectData, FirebaseError, void>): UseDataConnectMutationResult<DeleteProjectData, undefined>;
export function useDeleteProject(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteProjectData, FirebaseError, void>): UseDataConnectMutationResult<DeleteProjectData, undefined>;

export function useDeleteTask(options?: useDataConnectMutationOptions<DeleteTaskData, FirebaseError, void>): UseDataConnectMutationResult<DeleteTaskData, undefined>;
export function useDeleteTask(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteTaskData, FirebaseError, void>): UseDataConnectMutationResult<DeleteTaskData, undefined>;

export function useDeleteTag(options?: useDataConnectMutationOptions<DeleteTagData, FirebaseError, void>): UseDataConnectMutationResult<DeleteTagData, undefined>;
export function useDeleteTag(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteTagData, FirebaseError, void>): UseDataConnectMutationResult<DeleteTagData, undefined>;

export function useDeleteTaskTag(options?: useDataConnectMutationOptions<DeleteTaskTagData, FirebaseError, void>): UseDataConnectMutationResult<DeleteTaskTagData, undefined>;
export function useDeleteTaskTag(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteTaskTagData, FirebaseError, void>): UseDataConnectMutationResult<DeleteTaskTagData, undefined>;

export function useGetUserData(options?: useDataConnectQueryOptions<GetUserDataData>): UseDataConnectQueryResult<GetUserDataData, undefined>;
export function useGetUserData(dc: DataConnect, options?: useDataConnectQueryOptions<GetUserDataData>): UseDataConnectQueryResult<GetUserDataData, undefined>;

export function useGetProject(options?: useDataConnectQueryOptions<GetProjectData>): UseDataConnectQueryResult<GetProjectData, undefined>;
export function useGetProject(dc: DataConnect, options?: useDataConnectQueryOptions<GetProjectData>): UseDataConnectQueryResult<GetProjectData, undefined>;

export function useGetTask(options?: useDataConnectQueryOptions<GetTaskData>): UseDataConnectQueryResult<GetTaskData, undefined>;
export function useGetTask(dc: DataConnect, options?: useDataConnectQueryOptions<GetTaskData>): UseDataConnectQueryResult<GetTaskData, undefined>;

export function useGetTag(options?: useDataConnectQueryOptions<GetTagData>): UseDataConnectQueryResult<GetTagData, undefined>;
export function useGetTag(dc: DataConnect, options?: useDataConnectQueryOptions<GetTagData>): UseDataConnectQueryResult<GetTagData, undefined>;

export function useListProjects(options?: useDataConnectQueryOptions<ListProjectsData>): UseDataConnectQueryResult<ListProjectsData, undefined>;
export function useListProjects(dc: DataConnect, options?: useDataConnectQueryOptions<ListProjectsData>): UseDataConnectQueryResult<ListProjectsData, undefined>;

export function useListTasks(options?: useDataConnectQueryOptions<ListTasksData>): UseDataConnectQueryResult<ListTasksData, undefined>;
export function useListTasks(dc: DataConnect, options?: useDataConnectQueryOptions<ListTasksData>): UseDataConnectQueryResult<ListTasksData, undefined>;

export function useListTags(options?: useDataConnectQueryOptions<ListTagsData>): UseDataConnectQueryResult<ListTagsData, undefined>;
export function useListTags(dc: DataConnect, options?: useDataConnectQueryOptions<ListTagsData>): UseDataConnectQueryResult<ListTagsData, undefined>;
