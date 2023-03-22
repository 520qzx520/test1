const api = axios.create()
api.defaults.baseURL = 'http://127.0.0.1:3309'
api.defaults.headers['Content-Type'] = 'multipart/form-data';
api.defaults.transformRequest = (data, headers) => {
    const contentType = headers['Content-Type'];
    if (contentType === "application/x-www-form-urlencoded") return Qs.stringify(data);
    return data;
};


api.interceptors.response.use(res=>{
    return res.data
})