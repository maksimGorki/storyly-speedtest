import React, { useState } from 'react';
import './App.css';
import { Upload, Button, Spin, Progress } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import 'antd/es/spin/style/css';
import axios from 'axios';

function App() {
  const [fileLoading, setFileLoading] = useState(false);
  const [networkStats, setNetworkStats] = useState();
  const [percentage, setPercentage] = useState(0);
  let progress = 0;

  const presignedUrlEndpoint =
    'https://api.storyly.io/latencytest/presignedurl';
  const statsEndpoint = 'https://api.storyly.io/latencytest/stats';

  const handleUpload = async (option, region, accelerated = false) => {
    setPercentage(0);
    const { file } = option;
    const files = { files: [file?.name], bucket_region: region, accelerated };
    setFileLoading(true);
    const res = await axios.post(presignedUrlEndpoint, files);
    const fileData = {
      upload_url: res?.data?.data?.urls?.[0],
      file_path: res?.data?.data?.file_paths?.[0],
    };
    const startTime = new Date().getTime();
    await axios.put(fileData.upload_url, file, {
      headers: {
        'Content-Type': file.type,
        'Access-Control-Allow-Origin': '*',
      },
      onUploadProgress(progressEvent) {
        progress = Math.round(
          (progressEvent.loaded / progressEvent.total) * 100
        );
        setPercentage(progress);
      },
    });
    const endTime = new Date().getTime();
    const payload = {
      bucket_region: region,
      operation: 'upload',
      start: startTime,
      end: endTime,
      duration: endTime - startTime,
      file_size: file.size,
      file_name: file.name,
      file_path: fileData.file_path,
    };
    setFileLoading(false);
    setNetworkStats(payload);
    axios.post(statsEndpoint, payload);
  };

  const handleDownload = (url, region) => {
    const downloadFile = (data, filename, filetype = 'video/mp4') => {
      const blob = new Blob([data], { type: filetype });
      const tempElem = document.createElement('a');
      tempElem.download = filename;
      tempElem.href = window.URL.createObjectURL(blob);
      tempElem.style.display = 'none';
      document.body.appendChild(tempElem);
      tempElem.click();
      tempElem.remove();
      window.URL.revokeObjectURL(blob);
    };
    setPercentage(0);
    setFileLoading(true);
    // const downloadElement = document.createElement('a');
    // downloadElement.download = url.substr(url.lastIndexOf('/') + 1);
    // downloadElement.href = url;
    // downloadElement.setAttribute('download', true);
    // document.body.appendChild(downloadElement);
    // downloadElement.click();
    // document.body.removeChild(downloadElement);
    const startTime = new Date().getTime();
    axios({
      url,
      onDownloadProgress(progressEvent) {
        progress = Math.round(
          (progressEvent.loaded / progressEvent.total) * 100
        );
        setPercentage(progress);
      },
    }).then((response) => {
      const endTime = new Date().getTime();
      const payload = {
        bucket_region: region,
        operation: 'download',
        start: startTime,
        end: endTime,
        duration: endTime - startTime,
        file_size: parseInt(response.headers['content-length'], 10),
        file_name: url.substr(url.lastIndexOf('/') + 1),
        file_path: url,
      };
      setFileLoading(false);
      downloadFile(response.data, url.substr(url.lastIndexOf('/') + 1));
      setNetworkStats(payload);
      axios.post(statsEndpoint, payload);
    });
  };

  return (
    <div className="app-wrapper">
      <div className="content-container">
        <h1>Network Stats</h1>
        <div className="buttons-container">
          <Upload
            disabled={fileLoading}
            customRequest={(option) => handleUpload(option, 'eu-west-1', false)}
          >
            <Button
              className={`action-button ${fileLoading && 'disabled'}`}
              icon={<UploadOutlined style={{ color: '#7a4bff' }} />}
            >
              Upload to Ireland
            </Button>
          </Upload>
          <Upload
            disabled={fileLoading}
            customRequest={(option) =>
              handleUpload(option, 'ap-southeast-3', false)
            }
          >
            <Button
              className={`action-button ${fileLoading && 'disabled'}`}
              icon={<UploadOutlined style={{ color: '#7a4bff' }} />}
            >
              Upload to Indonesia
            </Button>
          </Upload>
          <Upload
            disabled={fileLoading}
            customRequest={(option) => handleUpload(option, 'eu-west-1', true)}
          >
            <Button
              className={`action-button ${fileLoading && 'disabled'}`}
              icon={<UploadOutlined style={{ color: '#7a4bff' }} />}
            >
              Upload to Edge
            </Button>
          </Upload>
        </div>
        {fileLoading && <Spin size="large" />}
        {!fileLoading && networkStats && (
          <div className="upload-stats-container">
            <h2>Network Operation Stats</h2>
            <span className="info-text">
              <span style={{ color: 'blueviolet' }}>Bucket Region: </span>{' '}
              {networkStats?.bucket_region}
            </span>
            <span className="info-text">
              <span style={{ color: 'blueviolet' }}>Operation: </span>
              {networkStats?.operation}
            </span>
            <span className="info-text">
              <span style={{ color: 'blueviolet' }}>Start: </span>
              {networkStats?.start} ms
            </span>
            <span className="info-text">
              <span style={{ color: 'blueviolet' }}>End: </span>
              {networkStats?.end} ms
            </span>
            <span className="info-text">
              <span style={{ color: 'blueviolet' }}>Duration: </span>
              {networkStats?.duration} ms
            </span>
            <span className="info-text">
              <span style={{ color: 'blueviolet' }}>File Size: </span>
              {networkStats?.file_size} byte
            </span>
            <span className="info-text">
              <span style={{ color: 'blueviolet' }}>File Name: </span>
              {networkStats?.file_name}
            </span>
            <span className="info-text">
              <span
                style={{ color: 'blueviolet', textDecoration: 'underlined' }}
              >
                File Path:{' '}
              </span>
              <span
                style={{ textDecoration: 'underline', cursor: 'pointer' }}
                onClick={() => window.open(networkStats?.file_path)}
              >
                {networkStats?.file_path.length > 60
                  ? `${networkStats?.file_path.substring(
                      0,
                      50
                    )}...${networkStats.file_path.substring(
                      networkStats.file_path.length - 10,
                      networkStats.file_path.length
                    )}`
                  : networkStats?.file_path}
              </span>
            </span>
          </div>
        )}
        <div className="buttons-container">
          <Button
            onClick={() =>
              handleDownload(
                'https://prod-storyly-upload-test-eu-west-1.s3.eu-west-1.amazonaws.com/file.mp4',
                'eu-west-1'
              )
            }
            className={`action-button ${fileLoading && 'disabled'}`}
            icon={<DownloadOutlined style={{ color: '#7a4bff' }} />}
          >
            Download from Ireland
          </Button>
          <Button
            onClick={() =>
              handleDownload(
                'https://prod-storyly-upload-test-ap-southeast-3.s3.ap-southeast-3.amazonaws.com/file.mp4',
                'ap-southeast-3'
              )
            }
            className={`action-button ${fileLoading && 'disabled'}`}
            icon={<DownloadOutlined style={{ color: '#7a4bff' }} />}
          >
            Download from Indonesia
          </Button>
        </div>
        {percentage ? (
          <Progress
            strokeColor={{
              from: '#108ee9',
              to: '#87d068',
            }}
            percent={percentage}
            status="active"
          />
        ) : (
          ''
        )}
      </div>
    </div>
  );
}

export default App;
