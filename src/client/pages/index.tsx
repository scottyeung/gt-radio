import { useEffect, useState } from "react";
import { v4 as uuid } from 'uuid';
import { socket, SocketContext } from "../context/socket";
import { StreamPlayer } from "./../components/StreamPlayer";
import { Chat }  from "./../components/Chat"
import { serverEmiters } from "../../socketEvents";
import { PageWrapper } from '@/components/PageWrapper';
import { BeatLoader } from "react-spinners";
import styles from '@/styles/Home.module.css'

const NMS_PORT = 8000;
const streamsListAPI = `${process.env.NEXT_PUBLIC_HOST}:${NMS_PORT}/api/streams`;

export default function Home(): JSX.Element{

  const [ liveStreams, setLiveStreams ] = useState<string[][]>([]);
  const [ isConnected, setIsConnected ] = useState(socket.connected);
  const [ streamLoaded, setStreamLoaded ] = useState<boolean>(false);
  const [ streamError, setStreamError ] = useState<boolean>(false);

  useEffect(() => {
    socket.on(serverEmiters.CONNECT, () => {
      setIsConnected(true);
    });
    socket.on(serverEmiters.DISCONNECT, () => {
      setIsConnected(false);
    });
    socket.on(serverEmiters.STREAM_DISCONNECT, hanldeStreamError);
    socket.on(serverEmiters.STREAM_REBOOT, handleStreamReboot);
    return () => {
      socket.off(serverEmiters.CONNECT);
      socket.off(serverEmiters.DISCONNECT);
      socket.off(serverEmiters.STREAM_REBOOT);
      socket.off(serverEmiters.STREAM_DISCONNECT);
    };
  }, []);

  useEffect(() => {
    if (isConnected){
      getLiveStream();
    };
  }, [ isConnected ]);


  function hanldeStreamError(): void{
    setStreamLoaded(true);
    setStreamError(true);
  };


  function handleStreamReboot():void{
    setStreamError(false);
    getLiveStream();
  };


  async function getLiveStream(): Promise<void>{
    try {
      const res = await fetch(streamsListAPI);
      if (!res.ok) return;
      const streams = await res.json();
      if (streams.live){
        const hlsAPIs: string[][] = Object.keys(streams.live)
          .map(stream => [String(NMS_PORT), stream]);
        setLiveStreams(hlsAPIs);
        setStreamLoaded(true);
      };
    } catch (err) {
      hanldeStreamError();
      console.error(
        `ERROR: could not get streams list from ${streamsListAPI}:  ${err}`
      );
    };
  };


  function makeStreamUrl(
    NMS_PORT: string,
    stream: string
  ): string{
    return `${process.env.NEXT_PUBLIC_HOST}:${NMS_PORT}/live/${stream}/index.m3u8`;
  };


  function displayMainStream(): JSX.Element[]{
    const streams = liveStreams.reduce((acc: JSX.Element[], streamInfo) => {
      const [ NMS_PORT, stream ] = streamInfo;
      if (isConnected && stream === 'main'){
        acc.push(
          <StreamPlayer 
            key={uuid()} 
            src={makeStreamUrl(NMS_PORT, stream)}
          />
        );
      };
      return acc;
    }, [])
    if (!streams.length) hanldeStreamError();
    return streams;
  };

  
  return (
    <PageWrapper>
      <SocketContext.Provider value={{ socket, isConnected }}>
        <div className={styles.radioContainer}>
          <div className={styles.radio}>
            {streamError
              ? <div>
                  <p>Error connecting to stream :(</p>
                  <p>Please wait to reconnect or try reloading page.</p>
                </div>
              : streamLoaded
              ? displayMainStream()
              : <BeatLoader 
                  size={13}
                  color="#000000"
                  cssOverride={{
                    marginLeft: "200px",
                    marginRight: "200px",
                    marginTop: "55px",
                    marginBottom: "55px"
                  }}
                />
            }
          </div>
          <Chat/>
        </div>
      </SocketContext.Provider>
    </PageWrapper>
  );
};
