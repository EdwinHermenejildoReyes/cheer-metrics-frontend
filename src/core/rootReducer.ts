import { combineReducers } from 'redux';
import authReducer from '@/store/auth/slices';

const rootReducer = combineReducers({
  auth: authReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
