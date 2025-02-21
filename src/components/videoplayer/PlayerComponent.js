"use client"
import React, { useEffect, useState } from 'react'
import { getSources } from '@/lib/getData';
import PlayerEpisodeList from './PlayerEpisodeList';
import { ContextSearch } from '@/context/DataContext';
import Player from './VidstackPlayer/player';
import { Spinner } from '@vidstack/react'

function PlayerComponent({ id, epId, provider, epNum, subdub, data, session, savedep }) {
    const { animetitle, setNowPlaying, setDataInfo } = ContextSearch();
    const [episodeData, setepisodeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [groupedEp, setGroupedEp] = useState(null);
    const [sources, setSources] = useState(null);
    const [subtitles, setSubtitles] = useState(null);
    const [thumbnails, setThumbnails] = useState(null);
    const [skiptimes, setSkipTimes] = useState(null);

    useEffect(() => {
        setDataInfo(data);
        const fetchSources = async () => {
            setLoading(true);
            try {
                const response = await getSources(id, provider, epId, epNum, subdub);

                console.log(response)
                // if (!response?.sources?.length > 0) {
                //     router.push('/');
                // }
                setSources(response?.sources);
                const download = response?.download

                console.log(response)
                const reFormSubtitles = response?.subtitles?.map((i) => ({
                    src: process.env.NEXT_PUBLIC_PROXY_URI + i.url,
                    label: i.lang,
                    kind: i.lang === "Thumbnails" ? "thumbnails" : "subtitles",
                    ...(i.lang === "English" && { default: true }),
                }));

                setSubtitles(reFormSubtitles?.filter((s) => s.kind !== 'thumbnails'));
                setThumbnails(response?.subtitles?.filter((s) => s.lang === 'Thumbnails'));

                const skipResponse = await fetch(
                    `https://api.aniskip.com/v2/skip-times/${data?.idMal}/${parseInt(epNum)}?types[]=ed&types[]=mixed-ed&types[]=mixed-op&types[]=op&types[]=recap&episodeLength=`
                );

                const skipData = await skipResponse.json();
                const op = skipData?.results?.find((item) => item.skipType === 'op') || null;
                const ed = skipData?.results?.find((item) => item.skipType === 'ed') || null;
                const episodeLength = skipData?.results?.find((item) => item.episodeLength)?.episodeLength || 0;

                const skiptime = [];

                if (op?.interval) {
                    skiptime.push({
                        startTime: op.interval.startTime ?? 0,
                        endTime: op.interval.endTime ?? 0,
                        text: 'Opening',
                    });
                }
                if (ed?.interval) {
                    skiptime.push({
                        startTime: ed.interval.startTime ?? 0,
                        endTime: ed.interval.endTime ?? 0,
                        text: 'Ending',
                    });
                } else {
                    skiptime.push({
                        startTime: op?.interval?.endTime ?? 0,
                        endTime: episodeLength,
                        text: '',
                    });
                }

                const episode = {
                    download: download || null,
                    skiptimes: skiptime || [],
                    epId: epId || null,
                    provider: provider || null,
                    epNum: epNum || null,
                    subtype: subdub || null,
                };

                setNowPlaying(episode);
                setSkipTimes(skiptime);
                console.log(skipData);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                const episode = {
                    download: null,
                    skiptimes: [],
                    epId: epId || null,
                    provider: provider || null,
                    epNum: epNum || null,
                    subtype: subdub || null,
                };

                setNowPlaying(episode);
                setLoading(false);
            }
        };
        fetchSources();
    }, [id, provider, epId, epNum, subdub]);

    useEffect(() => {
        if (episodeData) {
            const previousep = episodeData?.find(
                (i) => i.number === parseInt(epNum) - 1
            );
            const nextep = episodeData?.find(
                (i) => i.number === parseInt(epNum) + 1
            );
            const currentep = episodeData?.find(
                (i) => i.number === parseInt(epNum)
            );
            const epdata = {
                previousep,
                currentep,
                nextep,
            }
            setGroupedEp(epdata);
        }
    }, [episodeData, epId, provider, epNum, subdub]);

    return (
        <div className='xl:w-[99%]'>
            <div>
                <div className='mb-2'>
                    {!loading ? (
                        <div className='h-full w-full aspect-video overflow-hidden'>
                            <Player dataInfo={data} groupedEp={groupedEp} session={session} savedep={savedep} sources={sources} subtitles={subtitles} thumbnails={thumbnails} skiptimes={skiptimes} />
                        </div>
                    ) : (
                        <div className="h-full w-full rounded-[8px] relative flex items-center text-xl justify-center aspect-video">
                            <div className="pointer-events-none absolute inset-0 z-50 flex h-full w-full items-center justify-center">
                                <Spinner.Root className="text-white animate-spin opacity-100" size={84}>
                                    <Spinner.Track className="opacity-25" width={8} />
                                    <Spinner.TrackFill className="opacity-75" width={8} />
                                </Spinner.Root>
                            </div>
                        </div>
                    )}
                </div>
                <div className=' my-[9px] mx-2 sm:mx-1 px-1 lg:px-0'>
                    <h2 className='text-[20px]'>{data?.title?.[animetitle] || data?.title?.romaji}</h2>
                    <h2 className='text-[16px] text-[#ffffffb2]'>{` EPISODE ${epNum} `}</h2>
                </div>
            </div>
            <div className='w-[98%] mx-auto lg:w-full'>
                <PlayerEpisodeList id={id} data={data} setwatchepdata={setepisodeData} onprovider={provider} epnum={epNum} />
            </div>
        </div>
    )
}

export default PlayerComponent
