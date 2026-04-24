type ResponsePayload = {
  [key: string]: unknown;
};

export type MockResponse = {
  statusCode: number;
  payload: ResponsePayload | null;
  status: (code: number) => MockResponse;
  json: (payload: ResponsePayload) => MockResponse;
};

export const createMockResponse = (): MockResponse => {
  const res = {} as MockResponse;
  res.statusCode = 200;
  res.payload = null;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload: ResponsePayload) => {
    res.payload = payload;
    return res;
  };
  return res;
};
