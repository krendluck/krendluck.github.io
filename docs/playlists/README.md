# 播放列表数据目录

此目录包含所有由myQuery.js脚本生成的播放列表JSON文件。
每个文件包含一个完整的歌曲播放列表，由播放器读取和使用。

播放列表文件格式：

```json
{
  "id": "playlist_timestamp",
  "name": "播放列表名称",
  "songs": [
    {
      "title": "歌曲标题",
      "url": "歌曲URL"
    },
    ...
  ],
  "createdAt": "创建时间"
}
```
