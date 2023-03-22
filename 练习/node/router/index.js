const express = require('express')
const router = express.Router()
const path = require('path')
const db = require('../db')
const multiparty = require('multiparty')
const HOST = 'http://127.0.0.1'
const PORT = '3309'
const HOSTNAME = `${HOST}:${PORT}`;
const SparkMD5 = require('spark-md5'); //对文件进行计算
const fs = require('fs')
const { resolve } = require('path')
const delay = function delay(interval) {
    typeof interval !== "number" ? interval = 1000 : null;
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, interval);
    });
};

router.post('/upload', (req, res) => {
    let config = {};
    config.uploadDir = `${path.resolve(__dirname, '..')}/upload`
    new multiparty.Form(config)
        .parse(req, (err, fields, files) => {
            console.log(files.file[0].path)
            const sql = `update user set user_pic=? where id=?`
            db.query(sql, [files.file[0].path, 2], (err, results) => {
                if (err) return res.send(err)
                res.send({
                    code: 0,
                    data: {
                        path: files.file[0].path.replace(path.resolve(__dirname, '..'), HOSTNAME)
                    }
                })
            })
        });
})

router.post('/base64', (req, res) => {
    let file = decodeURIComponent(req.body.file)
    let filename = req.body.filename
    let suffix = /\.([0-9a-zA-Z]+)$/.exec(filename)[1]
    file = file.replace(/^data:image\/\w+;base64,/, "");
    file = Buffer.from(file, 'base64') //得到二进制
    const md5file = new SparkMD5.ArrayBuffer()
    md5file.append(file)
    let filepath = `${path.resolve(__dirname, '..')}/upload/${md5file.end()}.${suffix}`;
    let sql = 'update user set user_pic=? where id=?'
    db.query(sql, [filepath, 6], (err, results) => {
        if (err) return res.send({ message: err })
        fs.writeFile(filepath, file, err => {
            if (err) return res.send({ message: err })
            res.send({
                data: {
                    message: '上传成功',
                    path: filepath.replace(path.resolve(__dirname, '..'), HOSTNAME)
                }
            })
        })
    })
})

router.get('/already_upload', (req, res) => {
    let fileList = null
    let filepath = `${path.resolve(__dirname, '..')}/upload/${req.query.HASH}`
    try {
        fileList = fs.readdirSync(filepath);
        fileList = fileList.sort((a, b) => {
            let reg = /_(\d+)/;
            return reg.exec(a)[1] - reg.exec(b)[1];
        });
        res.send({
            data: {
                code: 0,
                file: fileList
            }
        })
    } catch (err) {
        res.send({
            data: {
                code: err,
                file: fileList
            }
        })
    }
})
const multiparty_upload = function multiparty_upload(req, auto) {
    typeof auto !== "boolean" ? auto = false : null;
    let config = {};
    //上传图片保存的地址 目录必须存在
    config.uploadDir = `${path.resolve(__dirname, '..')}/upload`
    return new Promise(async (resolve, reject) => {
        await delay();
        new multiparty.Form(config)
            .parse(req, (err, fields, files) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({
                    fields,
                    files
                });
            });
    });
};


// 创建文件并写入到指定的目录 & 返回客户端结果
const writeFile = function writeFile(res, paths, file, filename, stream) {
    return new Promise((resolve, reject) => {
        if (stream) {
            try {
                // 创建一个可读管道 (用于写入大文件)
                let readStream = fs.createReadStream(file.path),
                // 创建一个可写管道
                    writeStream = fs.createWriteStream(paths);
                // 用一个管（pipe方法）连接管道
                readStream.pipe(writeStream);
                // 写入结束
                readStream.on('end', () => {
                    resolve();
                    // 删除
                    fs.unlinkSync(file.path);
                    /*  __dirname: 当前模块的目录名。与 path.dirname(__filename)相同。
                            示例：从 /Users/mjr 运行 node example.js
                                console.log(__dirname); 打印: /Users/mjr
                                console.log(path.dirname(__filename)); 打印: /Users/mjr
                    */
                    res.send({
                        code: 0,
                        codeText: 'upload success',
                        originalFilename: filename,
                        paths,
                    });
                });
            } catch (err) {
                reject(err);
                res.send({
                    code: 1,
                    codeText: err,
                    paths
                });
            }
            return;
        }
    });
};
router.post('/upload_chunck', async (req, res) => {
    try{
        let {
            fields,
            files
        } = await multiparty_upload(req)
        let file = (files.file && files.file[0]) || {},
            filename = (fields.filename && fields.filename[0]) || "",
            paths = '',
            isExists = false; 
        let [, HASH] = /^([^_]+)_(\d+)/.exec(filename);
        // 创建存放切片的临时目录
        paths = `${path.resolve(__dirname, '..')}/upload/${HASH}`;
        !fs.existsSync(paths) ? fs.mkdirSync(paths) : null;
       
        paths = `${path.resolve(__dirname, '..')}/upload/${HASH}/${filename}`;
        writeFile(res, paths, file, filename, true);
    }catch (err) {
        res.send({
            code: 1,
            codeText: err
        });
    }

})

const merge = (HASH)=>{
   return new Promise((resolve,reject)=>{
    let filepath = `${path.resolve(__dirname, '..')}/upload/${HASH}`
    let fileList = fs.readdirSync(filepath)
    let reg = /_(\d+)/;
    let suffix = null
    fileList.sort((a,b)=>{
      return  reg.exec(a)[1] - reg.exec(b)[1]
    }).forEach(item=>{
        !suffix ? suffix = /\.([0-9a-zA-Z]+)$/.exec(item)[1] : null;
        fs.appendFileSync(`${filepath}.${suffix}`,fs.readFileSync(`${filepath}/${item}`))
        fs.unlinkSync(`${filepath}/${item}`)
    })
    fs.rmdirSync(filepath)
    resolve({
        path: `${filepath}.${suffix}`,
        filename: `${HASH}.${suffix}`
    });
   })
}

router.post('/upload_merge',async(req,res)=>{
   let {path,filename} = await merge(req.body.HASH)
   res.send({
    path,filename
   })
})

module.exports = router