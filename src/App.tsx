import React, { useEffect, useCallback, useState } from 'react';
import { buildGallery } from './3d/MapGenerator';
import { hangPaintings } from './3d/PaintingDrawer';
import Scene from './3d/Scene';
import './App.css';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useParams,
} from 'react-router-dom';
import CircularProgressWithLabel from './components/CircularProgressWithLabel';
import { Grid, useTheme, Typography } from '@mui/material';
import {
  extractNFTsFromNFTDetailResponse,
  getNFTsFromPolicyId,
  getNFTsFromStakeAddress,
  getStakeAddressFromAdaHandle,
  getStakeAddressFromPaymentAddress,
  loadPaintings,
} from './global/api';
import { FAQ, Welcome, Benefits } from './pages';
import { Picture, Room } from './global/types';

const Main = () => {
  const [progress, setProgress] = useState(0);
  const [sceneVisible, setSceneVisible] = useState(false);
  const [stage, setStage] = useState('Read wallet');
  const [nfts, setNfts] = useState<Array<Picture>>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [gallery, setGallery] = useState<Array<Room>>();
  const [paintings, setPaintings] = useState<Array<Picture>>([]);
  const { address, page } = useParams();
  const theme = useTheme();

  const fetchNFTs = useCallback(async () => {
    let pictures: Array<Picture> = [];
    let availablePages = 1;

    if (typeof address === 'undefined') return;
    try {
      let stakeAddress = address;
      if (address.startsWith('addr')) {
        stakeAddress = await getStakeAddressFromPaymentAddress(address);
      } else if (address.startsWith('$')) {
        stakeAddress = await getStakeAddressFromAdaHandle(address);
      }

      let nftDetailResponse = [];

      if (stakeAddress.startsWith('stake')) {
        nftDetailResponse = await getNFTsFromStakeAddress(stakeAddress);
      } else {
        nftDetailResponse = await getNFTsFromPolicyId(stakeAddress);
      }

      const nftsToDisplay = await extractNFTsFromNFTDetailResponse(
        nftDetailResponse,
        page
      );

      pictures = nftsToDisplay.pictures;
      availablePages = nftsToDisplay.totalPages;
    } catch (error) {
      console.error(error);
    }

    setProgress(21);
    setStage('Collecting NFT metadata and read images');

    const rooms = buildGallery(address, pictures.length, parseInt(page || '1'));

    setGallery(rooms);
    setNfts(pictures);
    setTotalPages(availablePages);
    hangPaintings(address, rooms, pictures);
    setStage('Rendering 3D gallery');
    setProgress(99);
  }, [address, page]);

  useEffect(() => {
    setNfts([]);
    setPaintings([]);
    setTotalPages(1);
    setGallery(undefined);
    setStage('Read wallet');
    setSceneVisible(false);
    setProgress(0);
  }, [address, page]);

  useEffect(() => {
    if (nfts.length === 0) {
      fetchNFTs();
    }
  }, [fetchNFTs, nfts]);

  useEffect(() => {
    if (sceneVisible && nfts.length > 0) {
      let stopFetching = false;
      const needToStop = () => stopFetching;
      loadPaintings(nfts, needToStop, setStage, setProgress, setPaintings);

      return () => {
        stopFetching = true;
      };
    }
  }, [sceneVisible, nfts]);

  const onSceneReady = useCallback(() => setSceneVisible(true), []);

  if (typeof gallery !== 'undefined') {
    if (nfts.length === 0) {
      return (
        <Grid
          sx={{
            height: '100%',
            textAlign: 'center',
            padding: 4,
          }}
          container
          justifyContent="center"
          alignContent="center"
          direction="column"
        >
          <Typography>
            This wallet does not appear to contain any NFTs, or the provided
            wallet address is incorrect. Please double-check the address and try
            again.
          </Typography>
          <Link style={{ color: theme.palette.secondary.main }} to="/">
            Go back
          </Link>
        </Grid>
      );
    }

    return (
      <Grid
        sx={{ height: '100%' }}
        container
        justifyContent="center"
        alignItems="center"
        direction="column"
      >
        <Typography sx={{ display: sceneVisible ? 'none' : 'block' }}>
          {stage}
        </Typography>
        <CircularProgressWithLabel
          sx={{ display: sceneVisible ? 'none' : 'flex' }}
          value={progress}
        />
        <Scene
          onSceneReady={onSceneReady}
          isVisible={sceneVisible}
          gallery={gallery}
          paintings={paintings}
          nfts={nfts}
          page={parseInt(page || '1')}
          totalPages={totalPages}
          address={address || ''}
        />
      </Grid>
    );
  } else {
    return (
      <Grid
        sx={{ height: '100%' }}
        container
        justifyContent="center"
        alignItems="center"
        direction="column"
      >
        <Typography>{stage}</Typography>
        <CircularProgressWithLabel value={progress} />
      </Grid>
    );
  }
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/benefits" element={<Benefits />} />
        <Route path="/:address" element={<Main />} />
        <Route path="/:address/:page" element={<Main />} />
      </Routes>
    </Router>
  );
};

export default App;
